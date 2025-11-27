"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/schema";
import { CATEGORY_MAPPING, MAIN_CATEGORIES } from "@/lib/categories";
import { updateProduct } from "@/app/actions";
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
  const [isPending, setIsPending] = useState(false);
  const [currentValue, setCurrentValue] = useState(
    type === "main" ? product["Main Category (EN)"] : product["Sub-Category (EN)"]
  );

  // Sync with product prop when it changes (after revalidation)
  useEffect(() => {
    setCurrentValue(type === "main" ? product["Main Category (EN)"] : product["Sub-Category (EN)"]);
  }, [product, type]);

  const handleValueChange = async (value: string) => {
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

    try {
      const result = await updateProduct(updatedProduct);
      if (!result.success) {
        console.error(result.error);
        // Revert on error
        setCurrentValue(type === "main" ? product["Main Category (EN)"] : product["Sub-Category (EN)"]);
      }
      // Success - the optimistic update is already shown, no need to reload
    } catch (error) {
      console.error(error);
      // Revert on error
      setCurrentValue(type === "main" ? product["Main Category (EN)"] : product["Sub-Category (EN)"]);
    } finally {
      setIsPending(false);
    }
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
