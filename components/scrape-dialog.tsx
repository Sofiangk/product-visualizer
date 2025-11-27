"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Upload, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Papa from "papaparse";
import { Product } from "@/lib/schema";

interface ScrapeDialogProps {
  products: Product[];
}

export function ScrapeDialog({ products }: ScrapeDialogProps) {
  const [open, setOpen] = useState(false);
  const [filterMissingImage, setFilterMissingImage] = useState(true);
  const [filterMissingDescription, setFilterMissingDescription] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  const getFilteredProducts = () => {
    return products.filter((product) => {
      const missingImage = !product.Image || product.Image.trim() === "";
      const missingDescription = 
        (!product["Short Description En"] || product["Short Description En"].trim() === "") &&
        (!product["Long Description En"] || product["Long Description En"].trim() === "");
      
      if (filterMissingImage && filterMissingDescription) {
        return missingImage || missingDescription;
      } else if (filterMissingImage) {
        return missingImage;
      } else if (filterMissingDescription) {
        return missingDescription;
      }
      return false;
    });
  };

  const filteredProducts = getFilteredProducts();

  const handleExport = () => {
    if (filteredProducts.length === 0) {
      alert("No products match the selected criteria");
      return;
    }

    // Generate timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    const csv = Papa.unparse(filteredProducts);
    
    // Add UTF-8 BOM for proper Excel encoding
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csv;

    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `products_to_scrape_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowInstructions(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Sparkles className="mr-2 h-4 w-4" />
          Scrape Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Products for Scraping</DialogTitle>
          <DialogDescription>
            Export products with missing data to enrich them using your Python scraping scripts.
          </DialogDescription>
        </DialogHeader>

        {!showInstructions ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <Label>Export products with missing:</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="missing-image"
                      checked={filterMissingImage}
                      onCheckedChange={(checked) => setFilterMissingImage(checked as boolean)}
                    />
                    <Label htmlFor="missing-image" className="font-normal cursor-pointer">
                      Images
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="missing-description"
                      checked={filterMissingDescription}
                      onCheckedChange={(checked) => setFilterMissingDescription(checked as boolean)}
                    />
                    <Label htmlFor="missing-description" className="font-normal cursor-pointer">
                      Descriptions (Short or Long)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} will be exported
                    </p>
                    <p className="text-muted-foreground">
                      These products are missing the selected data and can be enriched using your scraping scripts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription)}>
                <Download className="mr-2 h-4 w-4" />
                Export for Scraping
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-md">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  ✓ CSV Exported Successfully
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {filteredProducts.length} products exported to <code className="bg-green-100 dark:bg-green-900 px-1 rounded">products_to_scrape_*.csv</code>
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Next Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Locate the exported CSV file in your Downloads folder</li>
                  <li>Run your Python scraping script:
                    <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-x-auto">
python scraper_amazon.py products_to_scrape_*.csv
                    </pre>
                  </li>
                  <li>Wait for the scraper to enrich the products with images and descriptions</li>
                  <li>Import the enriched CSV back using the <strong>Import CSV</strong> button</li>
                </ol>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Tip:</strong> After scraping, use the Import CSV button in the toolbar to load the enriched data back into the app.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => {
                setShowInstructions(false);
                setOpen(false);
              }}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
