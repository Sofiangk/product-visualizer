import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { Product } from "./schema";

const CSV_PATH = path.join(process.cwd(), "public", "products.csv");

export async function readProducts(): Promise<Product[]> {
  const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep all values as strings to preserve barcodes
      transform: (value: string, field: string) => {
        // Filter out pandas "nan" values and empty strings
        if (value === 'nan' || value === 'NaN' || value === 'None' || !value || value.trim() === '') {
          // Set default values for Price and Quantity
          if (field === 'Price' || field === 'Quantity') {
            return '1';
          }
          return '';
        }
        
        // Ensure numeric fields that should remain as strings are preserved
        if (field === 'Barcode' || field === 'ID' || field === 'Price' || field === 'Quantity') {
          const trimmed = value.trim();
          // If Price or Quantity is "0" or empty, set to "1"
          if ((field === 'Price' || field === 'Quantity') && (trimmed === '0' || trimmed === '')) {
            return '1';
          }
          return trimmed;
        }
        return value.trim();
      },
      complete: (results) => {
        // Post-process to ensure Price and Quantity defaults
        const products = (results.data as Product[]).map((product) => {
          // Set Price to "1" if missing or "0"
          if (!product.Price || product.Price === '0' || product.Price.trim() === '' || 
              product.Price.toLowerCase() === 'nan' || product.Price === 'NaN' || product.Price === 'None') {
            product.Price = '1';
          }
          
          // Set Quantity to "1" if missing or "0"
          if (!product.Quantity || product.Quantity === '0' || product.Quantity.trim() === '' || 
              product.Quantity.toLowerCase() === 'nan' || product.Quantity === 'NaN' || product.Quantity === 'None') {
            product.Quantity = '1';
          }
          
          return product;
        });
        resolve(products);
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

export async function writeProducts(products: Product[]): Promise<void> {
  const csv = Papa.unparse(products, {
    quotes: true, // Quote all fields to preserve formatting
    quoteChar: '"',
    escapeChar: '"',
  });
  fs.writeFileSync(CSV_PATH, csv, "utf-8");
}
