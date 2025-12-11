import { chromium } from 'playwright';
import type { Product } from './schema';

// Brand patterns for detection
const BRAND_PATTERNS = [
  /\b(NATURE REPUBLIC)\b/i,
  /\b(CHICCO)\b/i,
  /\b(ACCU-CHEK|ACCUCHEK)\b/i,
  /\b(JCKOO)\b/i,
  /\b(KARSEELL)\b/i,
  /\b(EDG PLANT)\b/i,
  /\b(OLAY)\b/i,
  /\b(NIVEA)\b/i,
  /\b(L'OREAL|LOREAL)\b/i,
  /\b(GARNIER)\b/i,
  /\b(PANTENE)\b/i,
  /\b(HEAD & SHOULDERS)\b/i,
  /\b(DOVE)\b/i,
  /\b(SEBAMED)\b/i,
  /\b(VICHY)\b/i,
  /\b(LA ROCHE-POSAY)\b/i,
  /\b(AVENE)\b/i,
  /\b(CETAPHIL)\b/i,
  /\b(BIODERMA)\b/i,
];

function extractBrand(productName: string): string | null {
  if (!productName) return null;
  
  const productUpper = productName.toUpperCase();
  
  for (const pattern of BRAND_PATTERNS) {
    const match = productUpper.match(pattern);
    if (match) {
      return match[1].replace('®', '').trim();
    }
  }
  
  // Fallback: first capitalized word
  const words = productName.split(/\s+/);
  if (words.length > 0) {
    const firstWord = words[0];
    if (firstWord && firstWord[0] === firstWord[0].toUpperCase() && firstWord.length > 2) {
      return firstWord;
    }
  }
  
  return null;
}

function ensureImageExtension(url: string): string {
  if (!url) return '';
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const baseUrl = url.split('?')[0].split('#')[0];
  
  // Handle Amazon size parameters
  if (baseUrl.includes('._')) {
    const parts = baseUrl.split('._');
    const lastPart = parts[parts.length - 1].toLowerCase();
    
    for (const ext of imageExtensions) {
      if (lastPart.endsWith(ext)) {
        const baseWithoutParams = parts.slice(0, -1).join('._');
        return `${baseWithoutParams}${ext}`;
      }
    }
    return parts[0] + '.jpg';
  }
  
  const urlLower = baseUrl.toLowerCase();
  const hasExtension = imageExtensions.some(ext => urlLower.endsWith(ext));
  
  if (hasExtension) return baseUrl;
  
  // Default to .jpg for Amazon images
  if (urlLower.includes('amazon')) {
    return `${baseUrl}.jpg`;
  }
  
  return `${baseUrl}.jpg`;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
  return match ? match[1] : null;
}

async function searchAmazonViaDuckDuckGo(
  page: any,
  productName: string,
  brand: string | null,
  amazonDomains = ['amazon.sa', 'amazon.ae', 'amazon.eg']
): Promise<{ asin: string; domain: string } | null> {
  for (const domain of amazonDomains) {
    try {
      const searchQuery = brand 
        ? `site:${domain} ${brand} ${productName}`
        : `site:${domain} ${productName}`;
      
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchUrl = `https://duckduckgo.com/?q=${encodedQuery}`;
      
      console.log(`  Searching DuckDuckGo: ${searchQuery}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500 + Math.random() * 1000);
      
      const selectors = [
        'h2 a',
        'a[data-testid="result-title-a"]',
        '.result__a',
        'a[href*="amazon"]',
      ];
      
      let productUrl: string | null = null;
      
      for (const selector of selectors) {
        try {
          const links = await page.locator(selector).all();
          for (const link of links.slice(0, 5)) {
            const href = await link.getAttribute('href');
            if (href && href.includes('amazon') && (href.includes('/dp/') || href.includes('/gp/product/'))) {
              productUrl = href;
              break;
            }
          }
          if (productUrl) break;
        } catch (e) {
          continue;
        }
      }
      
      if (productUrl) {
        console.log(`  Found product URL: ${productUrl.substring(0, 100)}...`);
        const asin = extractAsin(productUrl);
        if (asin) {
          console.log(`  Extracted ASIN: ${asin}`);
          return { asin, domain };
        }
      }
    } catch (e) {
      console.error(`  Error searching ${domain}:`, e);
      continue;
    }
  }
  
  return null;
}

async function scrapeAmazonImages(
  page: any,
  asin: string,
  domain: string,
  maxImages = 5
): Promise<string[]> {
  const productUrl = `https://www.${domain}/-/en/dp/${asin}`;
  console.log(`  Accessing product page: ${productUrl}`);
  
  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000 + Math.random() * 1000);
    
    // Check for CAPTCHA
    try {
      const captchaCount = await page.locator('text=Enter the characters you see below').count();
      if (page.url().toLowerCase().includes('captcha') || captchaCount > 0) {
        console.log(`  CAPTCHA detected, skipping...`);
        return [];
      }
    } catch (e) {
      // Ignore
    }
    
    const images: string[] = [];
    
    // Get main image
    const mainImageSelectors = ['#landingImage', '#imgTagWrapperId img', '.a-dynamic-image'];
    
    for (const selector of mainImageSelectors) {
      try {
        const img = page.locator(selector).first();
        const count = await img.count();
        if (count > 0) {
          const src = await img.getAttribute('src');
          if (src && src.startsWith('http')) {
            let cleanUrl = src;
            if (src.includes('._')) {
              const parts = src.split('._');
              cleanUrl = parts[0];
            } else {
              cleanUrl = src.split('?')[0];
            }
            cleanUrl = ensureImageExtension(cleanUrl);
            if (cleanUrl && !images.includes(cleanUrl)) {
              images.push(cleanUrl);
              console.log(`    Main image: ${cleanUrl.substring(0, 80)}...`);
              break;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Get thumbnails
    const thumbnailSelectors = [
      '#imageBlock_feature_div ul li img',
      '.a-button-thumbnail img',
      '#altImages ul li img'
    ];
    
    for (const selector of thumbnailSelectors) {
      try {
        const thumbnails = await page.locator(selector).all();
        if (thumbnails.length > 0) {
          console.log(`    Found ${thumbnails.length} thumbnails`);
          
          for (const thumb of thumbnails.slice(0, maxImages * 2)) {
            try {
              let src = await thumb.getAttribute('data-old-src');
              if (!src || !src.startsWith('http')) {
                src = await thumb.getAttribute('src');
              }
              
              if (src && src.startsWith('http')) {
                if (src.toLowerCase().includes('transparent') || 
                    src.toLowerCase().includes('pixel') || 
                    src.toLowerCase().includes('placeholder')) {
                  continue;
                }
                
                let cleanUrl = src;
                if (src.includes('._')) {
                  const parts = src.split('._');
                  cleanUrl = parts[0];
                } else {
                  cleanUrl = src.split('?')[0];
                }
                
                cleanUrl = ensureImageExtension(cleanUrl);
                if (cleanUrl && !images.includes(cleanUrl) && images.length < maxImages) {
                  images.push(cleanUrl);
                  console.log(`    Image ${images.length}: ${cleanUrl.substring(0, 80)}...`);
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          if (images.length >= maxImages) break;
        }
      } catch (e) {
        continue;
      }
    }
    
    return images.slice(0, maxImages);
  } catch (e) {
    console.error(`  Error scraping images:`, e);
    return [];
  }
}

async function getArabicTitle(page: any, asin: string, domain: string): Promise<string | null> {
  const url = `https://www.${domain}/-/ar/dp/${asin}`;
  console.log(`  Fetching Arabic title: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);
    
    const titleCount = await page.locator('#productTitle').count();
    if (titleCount > 0) {
      const title = await page.locator('#productTitle').first().innerText();
      return title.trim();
    }
    return null;
  } catch (e) {
    console.error(`  Error fetching Arabic title:`, e);
    return null;
  }
}

export async function scrapeAdditionalImages(product: Product): Promise<Product> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    const productName = product.Product || '';
    const brand = extractBrand(productName);
    
    console.log(`\n--- Processing: ${productName} ---`);
    if (brand) {
      console.log(`  Detected brand: ${brand}`);
    }
    
    // Search for product
    const result = await searchAmazonViaDuckDuckGo(page, productName, brand);
    
    if (!result) {
      console.log(`  No product found on Amazon`);
      return product;
    }
    
    const { asin, domain } = result;
    
    // Scrape images
    const images = await scrapeAmazonImages(page, asin, domain, 5);
    
    // Get Arabic title
    const arabicName = await getArabicTitle(page, asin, domain);
    
    // Update product
    const updatedProduct = { ...product };
    
    if (arabicName) {
      updatedProduct['Name Ar'] = arabicName;
      console.log(`  ✓ Found Arabic Name: ${arabicName.substring(0, 50)}...`);
    }
    
    if (images.length > 0) {
      // If main image is missing, use first scraped image
      if (!product.Image || product.Image.trim() === '') {
        updatedProduct.Image = images[0];
        console.log(`  ✓ Assigned main image`);
        
        // Rest go to additional images
        if (images.length > 1) {
          const additionalImages = images.slice(1).join('|');
          updatedProduct['Additional Images'] = additionalImages;
          console.log(`  ✓ Added ${images.length - 1} additional images`);
        }
      } else {
        // Main image exists, all scraped images go to additional
        const existingAdditional = product['Additional Images'] || '';
        const existingList = existingAdditional.split('|').filter(img => img.trim());
        
        // Merge and deduplicate
        const allImages = [...existingList, ...images.filter(img => img !== product.Image)];
        const uniqueImages = Array.from(new Set(allImages));
        
        updatedProduct['Additional Images'] = uniqueImages.join('|');
        console.log(`  ✓ Updated with ${uniqueImages.length} additional images`);
      }
    } else {
      console.log(`  No images found`);
    }
    
    return updatedProduct;
  } catch (error) {
    console.error(`  Error processing product:`, error);
    return product;
  } finally {
    await browser.close();
  }
}
