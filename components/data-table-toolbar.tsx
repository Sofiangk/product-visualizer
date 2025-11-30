"use client";

import { Table } from "@tanstack/react-table";
import { X, RotateCcw, Undo2, Redo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { MAIN_CATEGORIES } from "@/lib/categories";
import { ExportDialog } from "./export-dialog";
import { ImportDialog } from "./import-dialog";
import { ScrapeDialog } from "./scrape-dialog";
import { ThemeToggle } from "./theme-toggle";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { Product } from "@/lib/schema";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onImport?: (products: Product[]) => void;
  onReset?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function DataTableToolbar<TData>({
  table,
  onImport,
  onReset,
  searchInputRef,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  
  // Extract data for export
  const products = table.getCoreRowModel().rows.map((row) => row.original as Product);
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original as Product);

  const handleReset = () => {
    if (onReset && confirm("Reset all products to default data? This will clear all your changes.")) {
      onReset();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-1">
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        <Input
          ref={searchInputRef}
          placeholder="Search products... (Ctrl+K)"
          value={(table.getColumn("Product")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("Product")?.setFilterValue(event.target.value)
          }
          className="h-8 w-full sm:w-[200px] flex-shrink-0"
        />
        <div className="flex items-center gap-2 flex-wrap">
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
      </div>
      <div className="flex items-center gap-2 justify-end flex-shrink-0">
        {/* History Controls Group */}
        {onUndo && onRedo && (
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 px-2"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 px-2"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Appearance Group */}
        <div className="flex items-center gap-1">
          <KeyboardShortcutsHelp />
          <ThemeToggle />
        </div>
        
        {/* Data Operations Group */}
        <div className="flex items-center gap-1">
          <ScrapeDialog products={products} onDataChange={onImport} />
          {onImport && <ImportDialog onImport={onImport} />}
          <ExportDialog products={products} selectedRows={selectedRows} />
        </div>
        
        {/* Reset Button (separate as it's destructive) */}
        {onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8"
            title="Reset to default data"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

