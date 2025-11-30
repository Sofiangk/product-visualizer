"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Product } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { CategoryEditableCell } from "./category-editable-cell";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePreview } from "./image-preview";
import { ProductActionsCell } from "./product-actions-cell";
import { ProductDialog } from "./product-dialog";

export const columns: ColumnDef<Product>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "ID",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    enableHiding: true, // Allow hiding
  },
  {
    accessorKey: "Image",
    header: "Image",
    cell: ({ row }) => {
      const image = row.getValue("Image") as string;
      return image ? (
        <ImagePreview src={image} alt={row.getValue("Product")} />
      ) : (
        <div className="h-16 w-16 bg-muted rounded-md border flex items-center justify-center text-xs text-muted-foreground">
          No Img
        </div>
      );
    },
    filterFn: (row, id, value): boolean => {
      const image = row.getValue(id) as string;
      const filterValues = value as string[];
      
      if (!filterValues || filterValues.length === 0) return true;
      
      const hasImage: boolean = Boolean(image && image.trim() !== "");
      
      // If both filters are selected, show all
      if (filterValues.includes("HAS_IMAGE") && filterValues.includes("NO_IMAGE")) {
        return true;
      }
      
      // If only HAS_IMAGE is selected
      if (filterValues.includes("HAS_IMAGE")) {
        return hasImage;
      }
      
      // If only NO_IMAGE is selected
      if (filterValues.includes("NO_IMAGE")) {
        return !hasImage;
      }
      
      return true;
    },
  },
  {
    accessorKey: "Product",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const [dialogOpen, setDialogOpen] = React.useState(false);
      return (
        <>
          <div 
            className="max-w-[250px] truncate font-medium cursor-pointer hover:text-primary hover:underline" 
            title={`Click to edit: ${row.getValue("Product")}`}
            onClick={() => setDialogOpen(true)}
          >
            {row.getValue("Product")}
          </div>
          <ProductDialog 
            product={row.original} 
            open={dialogOpen} 
            onOpenChange={setDialogOpen}
          />
        </>
      );
    },
  },
  {
    accessorKey: "Price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const price = row.getValue("Price") as string;
      if (!price || price.trim() === "" || price === "nan" || price === "NaN" || price === "None") {
        return <span className="text-muted-foreground">1.0</span>;
      }
      // Parse and format price consistently with one decimal place
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) {
        return <span className="text-muted-foreground">1.0</span>;
      }
      // Format to always show one decimal place (e.g., 85 -> 85.0, 150 -> 150.0, 1 -> 1.0)
      return <span>{numPrice.toFixed(1)}</span>;
    },
  },
  {
    accessorKey: "Main Category (EN)",
    header: "Main Category",
    cell: ({ row }) => (
      <CategoryEditableCell product={row.original} type="main" />
    ),
    filterFn: (row, id, value): boolean => {
      const category = row.getValue(id) as string;
      const filterValues = value as string[];
      
      if (!filterValues || filterValues.length === 0) return true;
      
      return filterValues.includes(category);
    },
  },
  {
    accessorKey: "Sub-Category (EN)",
    header: "Sub-Category",
    cell: ({ row }) => (
      <CategoryEditableCell product={row.original} type="sub" />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ProductActionsCell product={row.original} />,
  },
];
