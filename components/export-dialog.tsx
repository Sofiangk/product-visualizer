"use client";

import { useState } from "react";
import { Product } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import Papa from "papaparse";
import { Download } from "lucide-react";

interface ExportDialogProps {
  products: Product[];
  selectedRows?: Product[]; // Add selectedRows prop
}

const ALL_COLUMNS = [
  "ID",
  "Website",
  "Product",
  "Price",
  "Barcode",
  "Expiry Date",
  "Quantity",
  "Main Category (EN)",
  "Sub-Category (EN)",
  "Image",
  "Additional Images",
  "Short Description En",
  "Long Description En",
  "Short Description Ar",
  "Long Description Ar",
];

export function ExportDialog({ products, selectedRows }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS);
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");
  const [exportFormat, setExportFormat] = useState<"standard" | "magento">("standard");

  const handleToggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const handleExport = async () => {
    const sourceData = exportScope === "selected" && selectedRows?.length ? selectedRows : products;
    
    // Generate timestamp for filename using local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    
    let csv: string;
    let filename: string;

    if (exportFormat === "magento") {
      // Dynamic import to avoid bundling issues
      const { mapToMagento } = await import("@/lib/magento-mapper");
      const magentoData = mapToMagento(sourceData);
      csv = Papa.unparse(magentoData);
      filename = `magento_products_${timestamp}.csv`;
    } else {
      // Standard export with selected columns
      const dataToExport = sourceData.map((product) => {
        const filteredProduct: any = {};
        selectedColumns.forEach((col) => {
          filteredProduct[col] = (product as any)[col];
        });
        return filteredProduct;
      });
      csv = Papa.unparse(dataToExport);
      filename = `products_export_${timestamp}.csv`;
    }

    // Add UTF-8 BOM for proper Excel encoding (especially for Arabic characters)
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csv;

    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Products</DialogTitle>
          <DialogDescription>
            Select the columns you want to include in the CSV export.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="grid gap-4 py-4">
            {selectedRows && selectedRows.length > 0 && (
              <div className="flex flex-col space-y-2 mb-4 border-b pb-4">
                <Label>Export Scope</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="all" name="scope" checked={exportScope === "all"} onChange={() => setExportScope("all")} />
                    <Label htmlFor="all">All Products ({products.length})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="selected" name="scope" checked={exportScope === "selected"} onChange={() => setExportScope("selected")} />
                    <Label htmlFor="selected">Selected Rows ({selectedRows.length})</Label>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-2 mb-4 border-b pb-4">
              <Label>Export Format</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input type="radio" id="standard" name="format" checked={exportFormat === "standard"} onChange={() => setExportFormat("standard")} />
                  <Label htmlFor="standard">Standard (Custom Columns)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="radio" id="magento" name="format" checked={exportFormat === "magento"} onChange={() => setExportFormat("magento")} />
                  <Label htmlFor="magento">Magento Compatible</Label>
                </div>
              </div>
              {exportFormat === "magento" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Exports in Magento catalog import format with all required fields
                </p>
              )}
            </div>

            {exportFormat === "standard" && (
              <>
                <Label className="mb-2 block">Columns</Label>
                <div className="flex flex-col space-y-2"> {/* Added this div to wrap columns */}
                  {ALL_COLUMNS.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleToggleColumn(column)}
                      />
                      <Label htmlFor={column}>{column}</Label>
                    </div>
                  ))}
                </div> {/* Closing div for columns wrapper */}
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
