"use server";

import { readProducts, writeProducts } from "@/lib/csv";
import { Product, productSchema } from "@/lib/schema";
import { revalidatePath } from "next/cache";

export async function getProducts(): Promise<{ success: boolean; data?: Product[]; error?: string }> {
  try {
    const products = await readProducts();
    return { success: true, data: products };
  } catch (error) {
    console.error("Failed to read products:", error);
    return { success: false, error: "Failed to read products" };
  }
}

export async function updateProduct(updatedProduct: Product): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate the product
    const validation = productSchema.safeParse(updatedProduct);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const products = await readProducts();
    const index = products.findIndex((p) => p.ID === updatedProduct.ID);

    if (index === -1) {
      return { success: false, error: "Product not found" };
    }

    products[index] = updatedProduct;
    await writeProducts(products);
    // Don't revalidate to prevent pagination reset - optimistic updates handle UI
    return { success: true };
  } catch (error) {
    console.error("Failed to update product:", error);
    return { success: false, error: "Failed to update product" };
  }
}
