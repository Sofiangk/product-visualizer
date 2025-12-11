import asyncio
import pandas as pd
from playwright.async_api import async_playwright
import random
import os
import re
import sys

# Constants
INPUT_FILE = 'products.csv'
OUTPUT_FILE = 'products_updated.csv'
USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

def extract_asin(url):
    # Common patterns: /dp/B0..., /gp/product/B0...
    match = re.search(r'/([A-Z0-9]{10})(?:[/?]|$)', url)
    if match:
        return match.group(1)
    return None

async def get_amazon_content(page, url, lang='en'):
    print(f"Visiting ({lang}): {url}")
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(random.randint(2000, 5000))
        print(f"Page Title ({lang}): {await page.title()}")
        
        # Check for captcha
        if "captcha" in page.url or await page.locator('text=Enter the characters you see below').count() > 0:
            print("AMAZON CAPTCHA DETECTED!")
            # In a real scenario, we might pause or try to solve. 
            # For now, return None to indicate failure.
            return None

        content = {}
        
        # Image (only needed once, usually from English page)
        if lang == 'en':
            img_selector = '#landingImage, #imgTagWrapperId img, .a-dynamic-image'
            if await page.locator(img_selector).count() > 0:
                content['image'] = await page.locator(img_selector).first.get_attribute('src')
            else:
                content['image'] = ""

        # Short Description (Bullet points)
        bullets_selector = '#feature-bullets ul li span.a-list-item'
        bullets = await page.locator(bullets_selector).all_inner_texts()
        content['short_desc'] = "\n".join([b.strip() for b in bullets if b.strip()])

        # Long Description
        # #productDescription, #aplus, .aplus-v2
        long_desc = ""
        if await page.locator('#productDescription').count() > 0:
            long_desc = await page.locator('#productDescription').inner_text()
        elif await page.locator('#aplus').count() > 0:
            long_desc = await page.locator('#aplus').inner_text()
        
        content['long_desc'] = long_desc.strip()
        
        return content

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

async def search_and_scrape(row, page):
    product_name = row['Product']
    print(f"Processing: {product_name}")

    # 1. DuckDuckGo Search for Amazon SA
    search_query = f'site:amazon.sa {product_name}'
    encoded_query = search_query.replace(' ', '+')
    search_url = f"https://duckduckgo.com/?q={encoded_query}"
    
    asin = None
    
    try:
        await page.goto(search_url, wait_until='domcontentloaded')
        await page.wait_for_timeout(random.randint(2000, 4000))

        # Get first result link
        link_locator = page.locator('h2 a').first
        if await link_locator.count() > 0:
            product_url = await link_locator.get_attribute('href')
            print(f"Found Search URL: {product_url}")
            asin = extract_asin(product_url)
        else:
            print("No results found on DuckDuckGo.")
            return None

        if not asin:
            print("Could not extract ASIN from URL.")
            return None
            
        print(f"ASIN: {asin}")

        # 2. Scrape English Content
        en_url = f"https://www.amazon.sa/-/en/dp/{asin}"
        en_content = await get_amazon_content(page, en_url, lang='en')
        
        if not en_content:
            return None

        # 3. Scrape Arabic Content
        # Clear cookies to ensure language switch works or use the URL to force it
        await page.context.clear_cookies()
        
        ar_url = f"https://www.amazon.sa/-/ar/dp/{asin}"
        ar_content = await get_amazon_content(page, ar_url, lang='ar')
        
        if not ar_content:
            # If Arabic fails, we still return English content
            ar_content = {'short_desc': '', 'long_desc': ''}

        return {
            'image': en_content.get('image', ''),
            'short_desc_en': en_content.get('short_desc', ''),
            'long_desc_en': en_content.get('long_desc', ''),
            'short_desc_ar': ar_content.get('short_desc', ''),
            'long_desc_ar': ar_content.get('long_desc', '')
        }

    except Exception as e:
        print(f"Error processing {product_name}: {e}")
        return None

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
    
    # Ensure columns exist
    new_cols = ['Image', 'Short Description En', 'Long Description En', 'Short Description Ar', 'Long Description Ar']
    for col in new_cols:
        if col not in df.columns:
            df[col] = ""

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(user_agent=random.choice(USER_AGENTS))
        page = await context.new_page()

        for index, row in df.iterrows():
            # Skip if already has info (optional)
            # if pd.notna(row['Long Description En']) and row['Long Description En'] != "":
            #     continue

            print(f"--- Row {index+1} ---")
            data = await search_and_scrape(row, page)
            
            if data:
                df.at[index, 'Image'] = data['image']
                df.at[index, 'Short Description En'] = data['short_desc_en']
                df.at[index, 'Long Description En'] = data['long_desc_en']
                df.at[index, 'Short Description Ar'] = data['short_desc_ar']
                df.at[index, 'Long Description Ar'] = data['long_desc_ar']
            
            # Save periodically
            if index % 5 == 0:
                df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
                print("Progress saved.")

        await browser.close()

    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
    print(f"Done. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
