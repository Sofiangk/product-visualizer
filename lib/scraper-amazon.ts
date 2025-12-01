import { chromium, Browser, Page } from 'playwright';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

interface ScrapedData {
  image: string;
  short_desc_en: string;
  long_desc_en: string;
  short_desc_ar: string;
  long_desc_ar: string;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
  return match ? match[1] : null;
}

async function getAmazonContent(page: Page, url: string, lang: 'en' | 'ar' = 'en'): Promise<any | null> {
  console.log(`Visiting (${lang}): ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Random wait to mimic human behavior
    await page.waitForTimeout(Math.floor(Math.random() * 3000) + 2000);
    
    const title = await page.title();
    console.log(`Page Title (${lang}): ${title}`);

    // Check for captcha
    if (page.url().includes("captcha") || (await page.locator('text=Enter the characters you see below').count()) > 0) {
      console.log("AMAZON CAPTCHA DETECTED!");
      return null;
    }

    const content: any = {};

    // Image (only needed once, usually from English page)
    if (lang === 'en') {
      const imgSelectors = ['#landingImage', '#imgTagWrapperId img', '.a-dynamic-image'];
      let imgFound = false;
      for (const selector of imgSelectors) {
        if (await page.locator(selector).count() > 0) {
          content.image = await page.locator(selector).first().getAttribute('src');
          imgFound = true;
          break;
        }
      }
      if (!imgFound) content.image = "";
    }

    // Short Description (Bullet points)
    const bulletsSelector = '#feature-bullets ul li span.a-list-item';
    const bullets = await page.locator(bulletsSelector).allInnerTexts();
    content.short_desc = bullets.map(b => b.trim()).filter(b => b).join("\n");

    // Long Description
    let longDesc = "";
    if (await page.locator('#productDescription').count() > 0) {
      longDesc = await page.locator('#productDescription').innerText();
    } else if (await page.locator('#aplus').count() > 0) {
      longDesc = await page.locator('#aplus').innerText();
    }
    content.long_desc = longDesc.trim();

    return content;

  } catch (e) {
    console.error(`Error fetching ${url}: ${e}`);
    return null;
  }
}

export async function scrapeAmazonProduct(productName: string): Promise<ScrapedData | null> {
  console.log(`Processing: ${productName}`);
  
  const browser = await chromium.launch({ headless: true }); // Headless for API route
  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  });
  const page = await context.newPage();

  try {
    // 1. DuckDuckGo Search for Amazon SA
    const searchQuery = `site:amazon.sa ${productName}`;
    const encodedQuery = encodeURIComponent(searchQuery).replace(/%20/g, '+');
    const searchUrl = `https://duckduckgo.com/?q=${encodedQuery}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(Math.floor(Math.random() * 2000) + 2000);

    // Get first result link
    const linkLocator = page.locator('h2 a').first();
    let asin: string | null = null;

    if (await linkLocator.count() > 0) {
      const productUrl = await linkLocator.getAttribute('href');
      console.log(`Found Search URL: ${productUrl}`);
      if (productUrl) {
        asin = extractAsin(productUrl);
      }
    } else {
      console.log("No results found on DuckDuckGo.");
      await browser.close();
      return null;
    }

    if (!asin) {
      console.log("Could not extract ASIN from URL.");
      await browser.close();
      return null;
    }

    console.log(`ASIN: ${asin}`);

    // 2. Scrape English Content
    const enUrl = `https://www.amazon.sa/-/en/dp/${asin}`;
    const enContent = await getAmazonContent(page, enUrl, 'en');

    if (!enContent) {
      await browser.close();
      return null;
    }

    // 3. Scrape Arabic Content
    await context.clearCookies();
    const arUrl = `https://www.amazon.sa/-/ar/dp/${asin}`;
    const arContent = await getAmazonContent(page, arUrl, 'ar');

    await browser.close();

    return {
      image: enContent.image || '',
      short_desc_en: enContent.short_desc || '',
      long_desc_en: enContent.long_desc || '',
      short_desc_ar: arContent?.short_desc || '',
      long_desc_ar: arContent?.long_desc || ''
    };

  } catch (error) {
    console.error(`Error processing ${productName}:`, error);
    await browser.close();
    return null;
  }
}
