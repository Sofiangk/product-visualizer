import asyncio
import pandas as pd
from playwright.async_api import async_playwright
import random
import os
import urllib.parse
import re
import sys

# Constants
INPUT_FILE = 'products_export_2025-11-27_17-32-35.csv'
OUTPUT_FILE = 'products_export_2025-11-27_17-32-35_with_additional_images.csv'
USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

# Common brand patterns (case-insensitive matching)
BRAND_PATTERNS = [
    r'\b(NATURE REPUBLIC|NATURE REPUBLIC)\b',
    r'\b(CHICCO)\b',
    r'\b(ACCU-CHEK|ACCUCHEK)\b',
    r'\b(JCKOO)\b',
    r'\b(KARSEELL|KARSEELL®)\b',
    r'\b(EDG PLANT)\b',
    r'\b(OLAY)\b',
    r'\b(NIVEA)\b',
    r'\b(L\'OREAL|LOREAL)\b',
    r'\b(GARNIER)\b',
    r'\b(PANTENE)\b',
    r'\b(HEAD & SHOULDERS|HEADANDSHOULDERS)\b',
    r'\b(DOVE)\b',
    r'\b(SEBAMED)\b',
    r'\b(VICHY)\b',
    r'\b(LA ROCHE-POSAY|LAROCHEPOSAY)\b',
    r'\b(AVENE)\b',
    r'\b(CETAPHIL)\b',
    r'\b(BIODERMA)\b',
    r'\b(CLINIQUE)\b',
    r'\b(ESTEE LAUDER|ESTEELAUDER)\b',
    r'\b(MAC)\b',
    r'\b(MAYBELLINE)\b',
    r'\b(REVLON)\b',
    r'\b(RIMMEL)\b',
]

def extract_brand(product_name):
    """Extract brand from product name using common patterns."""
    if not product_name:
        return None
    
    product_upper = product_name.upper()
    
    # Try to match brand patterns (without word boundaries to catch embedded brands)
    for pattern in BRAND_PATTERNS:
        # Remove word boundaries and try to find brand anywhere in the name
        pattern_no_boundary = pattern.replace(r'\b', '')
        match = re.search(pattern_no_boundary, product_upper, re.IGNORECASE)
        if match:
            brand = match.group(1)
            # Normalize brand name
            brand = brand.replace('®', '').strip()
            return brand
    
    # Also try with word boundaries for exact matches
    for pattern in BRAND_PATTERNS:
        match = re.search(pattern, product_upper, re.IGNORECASE)
        if match:
            brand = match.group(1)
            brand = brand.replace('®', '').strip()
            return brand
    
    # If no pattern matches, try to extract first word(s) that look like a brand
    # (usually capitalized words at the start)
    words = product_name.split()
    if len(words) > 0:
        # Check if first word is all caps or title case (likely a brand)
        first_word = words[0]
        if first_word.isupper() or (first_word[0].isupper() and len(first_word) > 2):
            # Check if second word is also part of brand
            if len(words) > 1:
                second_word = words[1]
                if second_word.isupper() or (second_word[0].isupper() and len(second_word) > 2):
                    return f"{first_word} {second_word}"
            return first_word
    
    return None

def ensure_image_extension(url):
    """Ensure image URL has a proper image file extension."""
    if not url:
        return None
    
    # Common image extensions
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
    
    # Remove query parameters and fragments first
    base_url = url.split('?')[0].split('#')[0]
    
    # Remove Amazon size parameters (._AC_SX425_, etc.) but preserve extension if it exists
    # Pattern: ._AC_SX425_.jpg or ._AC_SX425_ (no extension)
    if '._' in base_url:
        # Split by ._ to separate base from size params
        parts = base_url.split('._')
        # Check if the last part (after ._) has an extension
        last_part = parts[-1].lower()
        if any(last_part.endswith(ext) for ext in image_extensions):
            # Extension exists in size params, extract it
            for ext in image_extensions:
                if last_part.endswith(ext):
                    # Get base without size params, add extension
                    base_without_params = '._'.join(parts[:-1])
                    return f"{base_without_params}{ext}"
        else:
            # No extension in size params, use base before ._
            base_url = parts[0]
    
    # Check if URL already has an extension
    url_lower = base_url.lower()
    has_extension = any(url_lower.endswith(ext) for ext in image_extensions)
    
    if has_extension:
        return base_url
    
    # For Amazon images, they typically use .jpg format
    if any(domain in url_lower for domain in ['amazon.com', 'amazon.sa', 'amazon.ae', 'amazon.eg', 'media-amazon.com']):
        # Amazon CDN images: add .jpg extension
        return f"{base_url}.jpg"
    
    # For other URLs, default to .jpg (most common format)
    return f"{base_url}.jpg"

def build_search_query(product_name, brand=None, category=None, subcategory=None):
    """Build a search query that includes brand and category for better matching."""
    query_parts = []
    
    # Add brand first (most important for accuracy)
    if brand:
        query_parts.append(brand)
    
    # Add product name
    query_parts.append(product_name)
    
    # Add category/subcategory for context
    if subcategory:
        query_parts.append(subcategory)
    elif category:
        query_parts.append(category)
    
    return " ".join(query_parts)

def extract_asin(url):
    """Extract ASIN from Amazon URL."""
    # Common patterns: /dp/B0..., /gp/product/B0...
    match = re.search(r'/([A-Z0-9]{10})(?:[/?]|$)', url)
    if match:
        return match.group(1)
    return None

async def search_amazon_product_via_duckduckgo(page, product_name, brand=None, amazon_domains=['amazon.sa', 'amazon.ae', 'amazon.eg']):
    """Search for product on Amazon using DuckDuckGo site search, return ASIN and domain."""
    
    for domain in amazon_domains:
        try:
            # Use DuckDuckGo to search Amazon site
            if brand:
                search_query = f'site:{domain} {brand} {product_name}'
            else:
                search_query = f'site:{domain} {product_name}'
            
            encoded_query = urllib.parse.quote(search_query)
            search_url = f"https://duckduckgo.com/?q={encoded_query}"
            
            print(f"  Searching DuckDuckGo: {search_query}")
            await page.goto(search_url, wait_until='domcontentloaded', timeout=20000)
            await page.wait_for_timeout(random.randint(1500, 2500))
            
            # Try multiple selectors for DuckDuckGo results
            selectors = [
                'h2 a',
                'a[data-testid="result-title-a"]',
                '.result__a',
                'a.result__a',
                'a[href*="amazon"]',
                '.result a[href*="amazon"]'
            ]
            
            product_url = None
            for selector in selectors:
                try:
                    # Try to find all links first
                    all_links = await page.locator(selector).all()
                    for link in all_links[:5]:  # Check first 5 results
                        href = await link.get_attribute('href', timeout=1000)
                        if href and 'amazon' in href.lower() and ('/dp/' in href or '/gp/product/' in href):
                            product_url = href
                            break
                    if product_url:
                        break
                except Exception as e:
                    continue
            
            # Fallback: try to find any Amazon link on the page
            if not product_url:
                try:
                    all_amazon_links = await page.locator('a[href*="amazon"]').all()
                    for link in all_amazon_links[:10]:
                        href = await link.get_attribute('href', timeout=1000)
                        if href and ('/dp/' in href or '/gp/product/' in href):
                            product_url = href
                            break
                except:
                    pass
            
            if product_url:
                print(f"  Found product URL: {product_url[:100]}...")
                asin = extract_asin(product_url)
                if asin:
                    print(f"  Extracted ASIN: {asin}")
                    return asin, domain
                else:
                    print(f"  Could not extract ASIN from URL")
            else:
                print(f"  No Amazon results found on DuckDuckGo for {domain}")
        except Exception as e:
            print(f"  Error searching {domain}: {e}")
            continue
    
    return None, None

async def scrape_amazon_images(page, asin, domain, max_images=5):
    """Scrape images from Amazon product page using ASIN."""
    # Build Amazon product URL
    product_url = f"https://www.{domain}/-/en/dp/{asin}"
    print(f"  Accessing product page: {product_url}")
    
    try:
        await page.goto(product_url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(random.randint(2000, 3000))
        
        # Check for CAPTCHA
        try:
            captcha_check = await page.locator('text=Enter the characters you see below').count(timeout=2000)
            if "captcha" in page.url.lower() or captcha_check > 0:
                print(f"  CAPTCHA detected, skipping...")
                return []
        except:
            pass
        
        images = []
        
        # Try to get main product image with timeout
        main_image_selectors = [
            '#landingImage',
            '#imgTagWrapperId img',
            '.a-dynamic-image'
        ]
        
        for selector in main_image_selectors:
            try:
                img = page.locator(selector).first
                count = await img.count(timeout=3000)
                if count > 0:
                    src = await img.get_attribute('src', timeout=2000)
                    if src and src.startswith('http'):
                        # Get high-res version (remove size parameters like ._AC_SX425_)
                        # But preserve extension if it exists
                        if '._' in src:
                            parts = src.split('._')
                            base = parts[0]
                            # Check if base already has extension
                            if not any(base.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                                clean_url = f"{base}.jpg"
                            else:
                                clean_url = base
                        else:
                            clean_url = src.split('?')[0]
                        
                        # Ensure URL has image extension
                        clean_url = ensure_image_extension(clean_url)
                        if clean_url and clean_url not in images:
                            images.append(clean_url)
                            print(f"    Main image: {clean_url[:80]}...")
                            break
            except Exception as e:
                continue
        
        # Try to get additional images from thumbnails/gallery
        thumbnail_selectors = [
            '#imageBlock_feature_div ul li img',
            '.a-button-thumbnail img',
            '#altImages ul li img'
        ]
        
        for selector in thumbnail_selectors:
            try:
                thumbnails = await page.locator(selector).all()
                if len(thumbnails) > 0:
                    print(f"    Found {len(thumbnails)} thumbnails")
                    
                    # Get image URLs from thumbnails without clicking (faster)
                    for i, thumb in enumerate(thumbnails[:max_images * 2]):
                        try:
                            # Get data-old-src or src attribute
                            src = await thumb.get_attribute('data-old-src', timeout=1000)
                            if not src or not src.startswith('http'):
                                src = await thumb.get_attribute('src', timeout=1000)
                            
                            if src and src.startswith('http'):
                                # Skip transparent/placeholder images
                                if 'transparent' in src.lower() or 'pixel' in src.lower() or 'placeholder' in src.lower():
                                    continue
                                
                                # Get high-res version (remove size parameters like ._AC_SX425_)
                                # But preserve extension if it exists
                                if '._' in src:
                                    # Split at ._ to remove size params, but check if extension exists before that
                                    parts = src.split('._')
                                    base = parts[0]
                                    # Check if base already has extension
                                    if not any(base.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                                        clean_url = f"{base}.jpg"
                                    else:
                                        clean_url = base
                                else:
                                    clean_url = src.split('?')[0]
                                
                                # Ensure URL has image extension
                                clean_url = ensure_image_extension(clean_url)
                                if clean_url and clean_url not in images and len(images) < max_images:
                                    images.append(clean_url)
                                    print(f"    Image {len(images)}: {clean_url[:80]}...")
                        except:
                            continue
                    
                    if len(images) >= max_images:
                        break
            except:
                continue
        
        return images[:max_images]
        
    except Exception as e:
        print(f"  Error scraping images: {e}")
        import traceback
        traceback.print_exc()
        return []

async def get_arabic_title(page, asin, domain):
    """Fetch the product title from the Arabic version of the page."""
    url = f"https://www.{domain}/-/ar/dp/{asin}"
    print(f"  Fetching Arabic title: {url}")
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(random.randint(1000, 2000))
        
        # Try to get title
        if await page.locator('#productTitle').count() > 0:
            title = await page.locator('#productTitle').first.inner_text()
            return title.strip()
        return None
    except Exception as e:
        print(f"  Error fetching Arabic title: {e}")
        return None

async def scrape_additional_images(page, product_name, brand=None, category=None, subcategory=None, max_images=5):
    """Scrape multiple images from Amazon product pages."""
    print(f"  Searching for images: {product_name}")
    
    try:
        # Search Amazon via DuckDuckGo to find product page
        asin, domain = await search_amazon_product_via_duckduckgo(page, product_name, brand)
        
        if not asin:
            print(f"  No product found on Amazon")
            return []
        
        # Scrape images from the product page using ASIN
        images = await scrape_amazon_images(page, asin, domain, max_images)
        
        return images, asin, domain
        
    except Exception as e:
        print(f"  Error searching for images: {e}")
        return [], None, None

async def validate_image_relevance(image_url, brand=None, product_name=None):
    """Basic validation - check if image URL or alt text contains brand/product keywords."""
    if not brand and not product_name:
        return True  # No validation criteria
    
    url_lower = image_url.lower()
    
    # Extract key words from product name (remove common words)
    if product_name:
        product_words = [w.lower() for w in product_name.split() 
                        if len(w) > 3 and w.lower() not in ['the', 'and', 'for', 'with', 'from']]
    else:
        product_words = []
    
    # Check if brand is in URL
    if brand:
        brand_lower = brand.lower()
        if brand_lower in url_lower:
            return True
    
    # Check if product keywords are in URL
    if product_words:
        for word in product_words[:3]:  # Check first 3 significant words
            if word in url_lower:
                return True
    
    # If no match, still return True (we'll let user review)
    # In production, you might want to be more strict
    return True

async def process_product(row, page, max_images=5):
    """Process a single product to get additional images."""
    product_name = row.get('Product', '')
    category = row.get('Main Category (EN)', '')
    subcategory = row.get('Sub-Category (EN)', '')
    existing_image = row.get('Image', '')
    existing_additional = row.get('Additional Images', '')
    
    print(f"\n--- Processing: {product_name} ---")
    
    # Extract brand
    brand = extract_brand(product_name)
    if brand:
        print(f"  Detected brand: {brand}")
    else:
        print(f"  No brand detected")
    
    # Scrape images (function now handles search internally)
    images, asin, domain = await scrape_additional_images(page, product_name, brand, category, subcategory, max_images)
    
    arabic_name = None
    if asin and domain:
        arabic_name = await get_arabic_title(page, asin, domain)
        if arabic_name:
            print(f"  ✓ Found Arabic Name: {arabic_name[:50]}...")

    if not images:
        print(f"  No images found")
        return None, None, arabic_name  # Return both main image and additional images
    
    # Validate images (basic check)
    validated_images = []
    for img in images:
        if await validate_image_relevance(img, brand, product_name):
            validated_images.append(img)
        else:
            print(f"  Skipped potentially irrelevant image: {img[:60]}...")
    
    if not validated_images:
        print(f"  No validated images found")
        return None, None, arabic_name
    
    # Check if main image is missing or empty
    main_image = None
    additional_images = []
    
    if not existing_image or pd.isna(existing_image) or str(existing_image).strip() == '' or str(existing_image).lower() in ['nan', 'none']:
        # Assign first image as main image if none exists
        main_image = validated_images[0]
        additional_images = validated_images[1:]  # Rest go to additional images
        print(f"  ✓ Assigned main image (was missing)")
    else:
        # Main image exists, filter it out from scraped images
        main_image = existing_image
        additional_images = [img for img in validated_images if img != existing_image]
    
    # Combine with existing additional images
    if existing_additional and pd.notna(existing_additional) and str(existing_additional).strip() and str(existing_additional).lower() not in ['nan', 'none']:
        existing_list = [img.strip() for img in str(existing_additional).split('|') if img.strip() and img.strip().lower() not in ['nan', 'none']]
        # Merge and deduplicate
        all_images = existing_list + additional_images
        unique_images = []
        seen = set()
        for img in all_images:
            if img not in seen:
                unique_images.append(img)
                seen.add(img)
        additional_images = unique_images
    
    print(f"  Found {len(additional_images)} additional images")
    
    print(f"  Found {len(additional_images)} additional images")
    
    return main_image, '|'.join(additional_images) if additional_images else None, arabic_name

async def main():
    global INPUT_FILE, OUTPUT_FILE
    
    if len(sys.argv) > 2:
        INPUT_FILE = sys.argv[1]
        OUTPUT_FILE = sys.argv[2]
        print(f"Using input file: {INPUT_FILE}")
        print(f"Using output file: {OUTPUT_FILE}")

    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    
    # Ensure 'Image' column exists as string type
    if 'Image' not in df.columns:
        df['Image'] = ""
    df['Image'] = df['Image'].astype(str)
    
    # Ensure 'Additional Images' column exists as string type
    if 'Additional Images' not in df.columns:
        df['Additional Images'] = ""
    # Convert to string type to avoid dtype warnings
    df['Additional Images'] = df['Additional Images'].astype(str)

    # Ensure Name columns exist
    if 'Name En' not in df.columns:
        df['Name En'] = ""
    if 'Name Ar' not in df.columns:
        df['Name Ar'] = ""
    
    # Initialize Name En with Product if empty
    mask = (df['Name En'] == "") | (df['Name En'].isna())
    df.loc[mask, 'Name En'] = df.loc[mask, 'Product']
    
    # Ask user for configuration
    print("=" * 60)
    print("Additional Images Scraper")
    print("=" * 60)
    print(f"Found {len(df)} products in {INPUT_FILE}")
    print("\nConfiguration:")
    
    # Auto-process all products (non-interactive mode)
    process_all = True
    start_idx = 0
    end_idx = len(df)
    max_images = 5  # Default max images per product
    
    print(f"\nProcessing products {start_idx} to {end_idx} (max {max_images} images each)")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(user_agent=random.choice(USER_AGENTS))
        page = await context.new_page()

        for index in range(start_idx, min(end_idx + 1, len(df))):
            row = df.iloc[index]
            
            # Skip if product name is missing
            if pd.isna(row.get('Product')) or not str(row.get('Product')).strip():
                print(f"\n--- Row {index+1}: Skipping (no product name) ---")
                continue
            
            main_image, additional_images, arabic_name = await process_product(row, page, max_images)
            
            updated = False

            # Update Names
            if arabic_name:
                # Save original English name if not already saved
                if pd.isna(row.get('Name En')) or str(row.get('Name En')).strip() == "":
                    df.at[index, 'Name En'] = row['Product']
                
                # Save Arabic name
                df.at[index, 'Name Ar'] = arabic_name
                
                # Update main Product column to Arabic
                df.at[index, 'Product'] = arabic_name
                updated = True
                print(f"  ✓ Updated Product name to Arabic")
            
            # Update main image if it was missing
            if main_image and (pd.isna(row.get('Image')) or not str(row.get('Image', '')).strip() or str(row.get('Image', '')).lower() in ['nan', 'none']):
                df.at[index, 'Image'] = str(main_image)
                updated = True
                print(f"  ✓ Assigned main image")
            
            # Update additional images
            if additional_images:
                # Ensure column is string type to avoid dtype warnings
                if 'Additional Images' not in df.columns:
                    df['Additional Images'] = ''
                df.at[index, 'Additional Images'] = str(additional_images)
                print(f"  ✓ Updated with {len(additional_images.split('|'))} additional images")
                updated = True
            elif not updated:
                print(f"  ✗ No images found or updated")
            
            # Save periodically (every 5 products)
            if (index - start_idx + 1) % 5 == 0:
                df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
                print(f"\n  💾 Progress saved to {OUTPUT_FILE}")
            
            # Small delay between products
            await page.wait_for_timeout(random.randint(1000, 2000))

        await browser.close()

    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
    print(f"\n{'=' * 60}")
    print(f"Done! Saved to {OUTPUT_FILE}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    asyncio.run(main())

