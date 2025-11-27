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
  return products.map((product) => {
    // Create URL-friendly key from product name
    const urlKey = product.Product
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Combine categories - format: "Parent/Child,Parent,All Products,Default Category"
    const mainCat = product["Main Category (EN)"] || "";
    const subCat = product["Sub-Category (EN)"] || "";
    
    let categories = "All Products,Default Category";
    if (mainCat && subCat) {
      categories = `${mainCat}/${subCat},${mainCat},All Products,Default Category`;
    } else if (mainCat) {
      categories = `${mainCat},All Products,Default Category`;
    }

    // Use product image for all image fields
    const imageUrl = product.Image || "";

    return {
      sku: product.Barcode || product.ID || `SKU-${product.ID}`,
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
      meta_description: product["Short Description En"] || "",
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
