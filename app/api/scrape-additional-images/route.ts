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

    const updatedProducts: Product[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n[${i + 1}/${products.length}] Processing: ${product.Product}`);
      
      const updatedProduct = await scrapeAdditionalImages(product);
      updatedProducts.push(updatedProduct);
      
      // Small delay between products
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
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
