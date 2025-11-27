import { z } from "zod";
import { CATEGORY_MAPPING } from "./categories";

export const productSchema = z.object({
  ID: z.string(),
  Website: z.string().optional(),
  Product: z.string().min(1, "Product name is required"),
  Price: z.string().optional(), // Keep as string to avoid parsing issues, or coerce to number
  Barcode: z.string().optional(),
  "Expiry Date": z.string().optional(),
  Quantity: z.string().optional(),
  "Main Category (EN)": z.string().refine((val) => Object.keys(CATEGORY_MAPPING).includes(val), {
    message: "Invalid Main Category",
  }),
  "Sub-Category (EN)": z.string(),
  Image: z.string().url().optional().or(z.literal("")),
  "Short Description En": z.string().optional(),
  "Long Description En": z.string().optional(),
  "Short Description Ar": z.string().optional(),
  "Long Description Ar": z.string().optional(),
}).refine((data) => {
  const validSubCategories = CATEGORY_MAPPING[data["Main Category (EN)"]] || [];
  return validSubCategories.includes(data["Sub-Category (EN)"]);
}, {
  message: "Invalid Sub-Category for the selected Main Category",
  path: ["Sub-Category (EN)"],
});

export type Product = z.infer<typeof productSchema>;
