import { NextRequest, NextResponse } from 'next/server';
import { scrapeAdditionalImages } from '@/lib/scraper-additional-images';
import type { Product } from '@/lib/schema';

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid products array' }, { status: 400 });
    }

    console.log(`\n=== Additional Images Scraper ===`);
    console.log(`Processing ${products.length} products...`);

    // Limit to 1 product on Vercel Hobby plan (10s timeout)
    const isVercel = process.env.VERCEL;
    const maxProducts = isVercel ? 1 : products.length;
    
    if (isVercel && products.length > 1) {
      console.log(`⚠ Vercel Hobby plan detected. Processing only first product (10s timeout limit).`);
    }

    const updatedProducts: Product[] = [];
    const productsToProcess = products.slice(0, maxProducts);

    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      console.log(`\n[${i + 1}/${productsToProcess.length}] Processing: ${product.Product}`);
      
      try {
        const updatedProduct = await scrapeAdditionalImages(product);
        updatedProducts.push(updatedProduct);
        console.log(`[${i + 1}/${productsToProcess.length}] ✓ Completed`);
      } catch (error) {
        console.error(`[${i + 1}/${productsToProcess.length}] ✗ Error:`, error);
        // Push original product if scraping fails
        updatedProducts.push(product);
      }
      
      // Small delay between products (only if processing multiple locally)
      if (!isVercel && i < productsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      }
    }

    // Add unprocessed products back (for Vercel when limited to 1)
    if (products.length > maxProducts) {
      updatedProducts.push(...products.slice(maxProducts));
    }

    console.log(`\n=== Scraping Complete ===`);
    console.log(`Processed ${updatedProducts.length} products`);

    return NextResponse.json({
      success: true,
      products: updatedProducts,
      message: `Successfully processed ${updatedProducts.length} products`
    });
  } catch (error) {
    console.error('Error in additional images scraper:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorStack,
        hint: 'Make sure Playwright browsers are installed: npx playwright install chromium'
      },
      { status: 500 }
    );
  }
}
