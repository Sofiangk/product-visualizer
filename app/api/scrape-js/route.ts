import { NextRequest, NextResponse } from "next/server";
import { scrapeAmazonProduct } from "@/lib/scraper-amazon";
import { Product } from "@/lib/schema";

export const maxDuration = 300; // 5 minutes max duration for Vercel/Next.js

export async function POST(req: NextRequest) {
  try {
    const { products } = await req.json();

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "Invalid input: products must be an array" },
        { status: 400 }
      );
    }

    const updatedProducts: Product[] = [];
    const failedProducts: string[] = [];

    // Process sequentially to avoid overwhelming the browser/network
    for (const product of products) {
      // Skip if already has info (optional check, can be done on client side too)
      // For now, we process everything sent to us
      
      try {
        const scrapedData = await scrapeAmazonProduct(product.Product);
        
        if (scrapedData) {
          updatedProducts.push({
            ...product,
            Image: scrapedData.image,
            "Short Description En": scrapedData.short_desc_en,
            "Long Description En": scrapedData.long_desc_en,
            "Short Description Ar": scrapedData.short_desc_ar,
            "Long Description Ar": scrapedData.long_desc_ar,
          });
        } else {
          updatedProducts.push(product); // Keep original if failed
          failedProducts.push(product.Product);
        }
      } catch (error) {
        console.error(`Error scraping ${product.Product}:`, error);
        updatedProducts.push(product);
        failedProducts.push(product.Product);
      }
    }

    return NextResponse.json({
      products: updatedProducts,
      failed: failedProducts,
      message: `Processed ${products.length} products. ${updatedProducts.length - failedProducts.length} successful, ${failedProducts.length} failed.`
    });

  } catch (error) {
    console.error("Scraper API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
