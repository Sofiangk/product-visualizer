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
import { Sparkles, Download, Upload, Info, FileCode2, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Papa from "papaparse";
import { Product } from "@/lib/schema";

interface ScrapeDialogProps {
  products: Product[];
  onDataChange?: (products: Product[]) => void;
}

type ScraperType = 'amazon' | 'additional_images';
type ScraperStatus = 'idle' | 'running' | 'success' | 'error';

export function ScrapeDialog({ products, onDataChange }: ScrapeDialogProps) {
  const [open, setOpen] = useState(false);
  const [filterMissingImage, setFilterMissingImage] = useState(true);
  const [filterMissingDescription, setFilterMissingDescription] = useState(true);
  const [selectedScraper, setSelectedScraper] = useState<ScraperType>('amazon');
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus>('idle');
  const [scraperOutput, setScraperOutput] = useState<string[]>([]);
  const [showExportInstructions, setShowExportInstructions] = useState(false);

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

  const handleRunScraper = async () => {
    if (filteredProducts.length === 0) {
      alert("No products match the selected criteria");
      return;
    }

    setScraperStatus('running');
    setScraperOutput([]);

    try {
      const csv = Papa.unparse(filteredProducts);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `products_to_scrape_${timestamp}.csv`;

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scraper: selectedScraper,
          csvData: csv,
          filename,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            
            if (message.type === 'stdout' || message.type === 'stderr') {
              setScraperOutput(prev => [...prev, message.data]);
            } else if (message.type === 'complete') {
              setScraperStatus('success');
              setScraperOutput(prev => [...prev, '\n✓ Scraping completed successfully!']);
              
              // Parse and update products
              if (onDataChange && message.data) {
                const parsed = Papa.parse(message.data, { header: true });
                if (parsed.data) {
                  onDataChange(parsed.data as Product[]);
                }
              }
            } else if (message.type === 'error') {
              setScraperStatus('error');
              setScraperOutput(prev => [...prev, `\n✗ Error: ${message.data}`]);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        }
      }
    } catch (error) {
      setScraperStatus('error');
      setScraperOutput(prev => [...prev, `\n✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      alert("No products match the selected criteria");
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    const csv = Papa.unparse(filteredProducts);
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
    
    setShowExportInstructions(true);
  };

  const resetDialog = () => {
    setScraperStatus('idle');
    setScraperOutput([]);
    setShowExportInstructions(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Sparkles className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Scrape Data</span>
          <span className="sm:hidden">Scrape</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Run Scrapers Locally</DialogTitle>
          <DialogDescription>
            Export products or run Python scrapers directly from the app to enrich missing data.
          </DialogDescription>
        </DialogHeader>

        {!showExportInstructions && scraperStatus === 'idle' && (
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
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} will be processed
                    </p>
                    <p className="text-muted-foreground">
                      Choose a scraper to run locally or export CSV for manual processing.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Select Scraper:</Label>
                <RadioGroup value={selectedScraper} onValueChange={(value) => setSelectedScraper(value as ScraperType)}>
                  <div className="flex items-start space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="amazon" id="amazon" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="amazon" className="font-medium cursor-pointer">
                        Amazon Scraper (Bilingual)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Scrapes images and descriptions (EN & AR) from Amazon.sa
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="additional_images" id="additional_images" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="additional_images" className="font-medium cursor-pointer">
                        Additional Images Scraper
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Scrapes multiple product images with brand-aware search
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV} 
                disabled={filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription)}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV Only
              </Button>
              <Button 
                onClick={handleRunScraper} 
                disabled={filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription)}
                className="w-full sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4" />
                Run Scraper Locally
              </Button>
            </DialogFooter>
          </>
        )}

        {(scraperStatus === 'running' || scraperStatus === 'success' || scraperStatus === 'error') && (
          <>
            <div className="space-y-4 py-4">
              <div className={`border rounded-lg p-4 ${
                scraperStatus === 'running' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950' :
                scraperStatus === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950' :
                'border-red-200 bg-red-50 dark:bg-red-950'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {scraperStatus === 'running' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                  {scraperStatus === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {scraperStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  <h4 className="font-medium">
                    {scraperStatus === 'running' && 'Scraper Running...'}
                    {scraperStatus === 'success' && 'Scraping Completed!'}
                    {scraperStatus === 'error' && 'Scraping Failed'}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {scraperStatus === 'running' && 'Please wait while the scraper processes your products...'}
                  {scraperStatus === 'success' && 'Products have been enriched and updated automatically.'}
                  {scraperStatus === 'error' && 'An error occurred during scraping. Check the output below.'}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Scraper Output:</Label>
                <ScrollArea className="h-[300px] w-full border rounded-md p-4 bg-muted/50">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {scraperOutput.join('')}
                  </pre>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              {scraperStatus === 'running' ? (
                <Button disabled className="w-full sm:w-auto">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </Button>
              ) : (
                <Button onClick={() => {
                  resetDialog();
                  setOpen(false);
                }} className="w-full sm:w-auto">
                  {scraperStatus === 'success' ? 'Done' : 'Close'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {showExportInstructions && (
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

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileCode2 className="h-4 w-4" />
                  Manual Scraper Instructions:
                </h4>
                
                <div className="space-y-3 text-sm">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Locate the exported CSV in your Downloads folder</li>
                    <li>Copy it to your <code className="bg-muted px-1 rounded">saidalia_scraper</code> folder</li>
                    <li>Run the scraper manually:
                      <pre className="bg-muted p-2 rounded mt-1 text-xs overflow-x-auto">
python scraper_amazon.py
# or
python scraper_additional_images.py
                      </pre>
                    </li>
                    <li>Import the enriched CSV back using the <strong>Import CSV</strong> button</li>
                  </ol>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => {
                setShowExportInstructions(false);
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
