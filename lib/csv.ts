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
      complete: (results) => {
        resolve(results.data as Product[]);
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

export async function writeProducts(products: Product[]): Promise<void> {
  const csv = Papa.unparse(products);
  fs.writeFileSync(CSV_PATH, csv, "utf-8");
}
