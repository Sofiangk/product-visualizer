"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/schema";
import { CATEGORY_MAPPING, MAIN_CATEGORIES } from "@/lib/categories";
import { useProducts } from "@/lib/products-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryEditableCellProps {
  product: Product;
  type: "main" | "sub";
}

export function CategoryEditableCell({ product, type }: CategoryEditableCellProps) {
  const { updateProduct } = useProducts();
  const [isPending, setIsPending] = useState(false);
  const [currentValue, setCurrentValue] = useState(
    type === "main" ? product["Main Category (EN)"] : product["Sub-Category (EN)"]
  );

  // Sync with product prop when it changes
  useEffect(() => {
    setCurrentValue(type === "main" ? product["Main Category (EN)"] : product["Sub-Category (EN)"]);
  }, [product, type]);

  const handleValueChange = (value: string) => {
    setIsPending(true);
    
    // Optimistic update
    setCurrentValue(value);
    
    const updatedProduct = { ...product };

    if (type === "main") {
      updatedProduct["Main Category (EN)"] = value;
      // Set the first valid sub-category instead of empty string
      const validSubCategories = CATEGORY_MAPPING[value] || [];
      updatedProduct["Sub-Category (EN)"] = validSubCategories[0] || "";
    } else {
      updatedProduct["Sub-Category (EN)"] = value;
    }

    // Update in context (persists to localStorage)
    updateProduct(updatedProduct);
    setIsPending(false);
  };

  if (type === "main") {
    return (
      <Select
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="Select Category" />
        </SelectTrigger>
        <SelectContent>
          {MAIN_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Sub-category
  const mainCategory = product["Main Category (EN)"];
  const subCategories = CATEGORY_MAPPING[mainCategory] || [];

  return (
    <Select
      value={currentValue}
      onValueChange={handleValueChange}
      disabled={isPending || !mainCategory || subCategories.length === 0}
    >
      <SelectTrigger className="h-8 w-[180px]">
        <SelectValue placeholder="Select Sub-Category" />
      </SelectTrigger>
      <SelectContent>
        {subCategories.map((subCategory) => (
          <SelectItem key={subCategory} value={subCategory}>
            {subCategory}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
