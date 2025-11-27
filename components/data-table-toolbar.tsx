"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { MAIN_CATEGORIES } from "@/lib/categories";
import { ExportDialog } from "./export-dialog";
import { ImportDialog } from "./import-dialog";
import { ScrapeDialog } from "./scrape-dialog";
import { Product } from "@/lib/schema";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onImport?: (products: Product[]) => void;
}

export function DataTableToolbar<TData>({
  table,
  onImport,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  
  // Extract data for export
  const products = table.getCoreRowModel().rows.map((row) => row.original as Product);
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original as Product);

  return (
    <div className="flex items-center justify-between flex-1">
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        <Input
          placeholder="Search products..."
          value={(table.getColumn("Product")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("Product")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[200px]"
        />
        <div className="flex items-center gap-2">
          {table.getColumn("Main Category (EN)") && (
            <DataTableFacetedFilter
              column={table.getColumn("Main Category (EN)")}
              title="Category"
              options={MAIN_CATEGORIES.map((c) => ({ label: c, value: c }))}
            />
          )}
          {table.getColumn("Image") && (
            <DataTableFacetedFilter
              column={table.getColumn("Image")}
              title="Image"
              options={[
                { label: "Has Image", value: "HAS_IMAGE" },
                { label: "No Image", value: "NO_IMAGE" },
              ]}
            />
          )}
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ScrapeDialog products={products} />
        {onImport && <ImportDialog onImport={onImport} />}
        <ExportDialog products={products} selectedRows={selectedRows} />
      </div>
    </div>
  );
}
