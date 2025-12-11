import { Product } from "./schema";

export interface MagentoProduct {
  sku: string;
  store_view_code: string;
  attribute_set_code: string;
  product_type: string;
  categories: string;
  product_websites: string;
  name: string;
  description: string;
  short_description: string;
  weight: string;
  product_online: string;
  tax_class_name: string;
  visibility: string;
  price: string;
  url_key: string;
  meta_title: string;
  meta_keywords: string;
  meta_description: string;
  base_image: string;
  small_image: string;
  small_image_label: string;
  thumbnail_image: string;
  display_product_options_in: string;
  qty: string;
  additional_images: string;
  additional_attributes: string;
}

export function mapToMagento(products: Product[]): MagentoProduct[] {
  // Deduplicate products based on barcode/SKU
  // Keep only the first occurrence of each unique barcode
  const seenBarcodes = new Set<string>();
  const deduplicatedProducts = products.filter((product) => {
    const barcode = product.Barcode ? product.Barcode.trim() : "";
    
    // Skip products with empty barcodes (they'll get generated SKUs)
    if (!barcode) {
      return true;
    }
    
    // Check if barcode is scientific notation (invalid)
    const isScientific = /^[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+$/.test(barcode);
    if (isScientific) {
      return true; // Keep these, they'll get generated SKUs
    }
    
    // Filter out duplicates
    if (seenBarcodes.has(barcode)) {
      return false; // Skip duplicate
    }
    
    seenBarcodes.add(barcode);
    return true; // Keep first occurrence
  });

  const usedSkus = new Set<string>();

  return deduplicatedProducts.map((product) => {
    // Create URL-friendly key from product name
    const urlKey = product.Product
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Combine categories - format: "Default Category/Parent/Child,Default Category/Parent,All Products,Default Category"
    const mainCat = product["Main Category (EN)"] || "";
    const subCat = product["Sub-Category (EN)"] || "";
    
    let categories = "All Products,Default Category";
    if (mainCat && subCat) {
      categories = `Default Category/${mainCat}/${subCat},Default Category/${mainCat},All Products,Default Category`;
    } else if (mainCat) {
      categories = `Default Category/${mainCat},All Products,Default Category`;
    }

    // Use product image for all image fields
    const imageUrl = product.Image || "";

    // SKU Generation Logic
    let sku = "";
    const barcode = product.Barcode ? product.Barcode.trim() : "";
    
    // Check if barcode is valid (not empty and not scientific notation)
    const isScientific = /^[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+$/.test(barcode);
    
    if (barcode && !isScientific) {
      sku = barcode;
    } else {
      // Generate fallback SKU: CAT-SUB-ID
      const mainCatPrefix = (product["Main Category (EN)"] || "GEN").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
      const subCatPrefix = (product["Sub-Category (EN)"] || "GEN").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase().padEnd(3, "X");
      const id = (product.ID || "0").toString().padStart(3, "0");
      sku = `${mainCatPrefix}${subCatPrefix}${id}`;
    }

    // Ensure Uniqueness (should rarely be needed now due to deduplication)
    let finalSku = sku;
    let counter = 1;
    while (usedSkus.has(finalSku)) {
      finalSku = `${sku}-${counter}`;
      counter++;
    }
    usedSkus.add(finalSku);

    return {
      sku: finalSku,
      store_view_code: "",
      attribute_set_code: "Default",
      product_type: "simple",
      categories,
      product_websites: "base",
      name: product.Product,
      description: product["Long Description En"] || product["Short Description En"] || "",
      short_description: product["Short Description En"] || "",
      weight: "",
      product_online: "1",
      tax_class_name: "",
      visibility: "Catalog, Search",
      price: product.Price || "1",
      url_key: urlKey,
      meta_title: product.Product,
      meta_keywords: "",
      meta_description: (product["Short Description En"] || "").substring(0, 255),
      base_image: imageUrl,
      small_image: imageUrl,
      small_image_label: "",
      thumbnail_image: imageUrl,
      display_product_options_in: "Block after Info Column",
      qty: product.Quantity || "1",
      additional_images: product["Additional Images"] || "",
      additional_attributes: "requires_prescription=No",
    };
  });
}
