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

type ScraperType = 'amazon' | 'amazon_js' | 'additional_images';
type ScraperStatus = 'idle' | 'running' | 'success' | 'error';

export function ScrapeDialog({ products, onDataChange }: ScrapeDialogProps) {
  const [open, setOpen] = useState(false);
  const [showDevWarning, setShowDevWarning] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [sourceType, setSourceType] = useState<'table' | 'file'>('table');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleRunScraper = async () => {
    let csvData = "";
    
    if (sourceType === 'table') {
      if (filteredProducts.length === 0) {
        alert("No products match the selected criteria");
        return;
      }
      csvData = Papa.unparse(filteredProducts);
    } else {
      if (!uploadedFile) {
        alert("Please select a CSV file");
        return;
      }
      // Read file content
      csvData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(uploadedFile);
      });
    }

    setScraperStatus('running');
    setScraperOutput([]);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = sourceType === 'file' && uploadedFile 
        ? uploadedFile.name 
        : `products_to_scrape_${timestamp}.csv`;

      const endpoint = selectedScraper === 'amazon_js' ? '/api/scrape-js' : '/api/scrape';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: sourceType === 'table' ? filteredProducts : [], // JS scraper expects products array
          scraper: selectedScraper,
          csvData, // Python scraper expects CSV string
          filename,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (selectedScraper === 'amazon_js') {
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        
        setScraperStatus('success');
        setScraperOutput(prev => [...prev, '\n✓ JS Scraping completed successfully!', `\n${result.message}`]);
        
        if (onDataChange && result.products) {
          onDataChange(result.products);
        }
      } else {
        // Stream handling for Python scraper
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
    setSourceType('table');
    setUploadedFile(null);
    setShowDevWarning(true);
  };

  return (
    <>
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
          <DialogHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1.5 text-left">
              <DialogTitle>Run Scrapers Locally</DialogTitle>
              <DialogDescription>
                Enrich product data using Python scrapers.
              </DialogDescription>
            </div>
            {!showDevWarning && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1"
                onClick={() => setShowHelp(true)}
                title="Scraper Instructions"
              >
                <Info className="h-5 w-5" />
              </Button>
            )}
          </DialogHeader>

          {showDevWarning ? (
            <div className="py-6 space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg flex gap-3">
                <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-200">Developer Confirmation Required</h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    This feature runs Python scripts on your local machine. It requires a configured Python environment with necessary dependencies (playwright, pandas).
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                    Only proceed if you are a developer and have set up the environment.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowDevWarning(false)}>
                  I am a Developer
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              {!showExportInstructions && scraperStatus === 'idle' && (
                <>
                  <div className="grid gap-4 py-4">
                    {/* Source Selection */}
                    <div className="space-y-3">
                      <Label>Data Source:</Label>
                      <RadioGroup value={sourceType} onValueChange={(value) => setSourceType(value as 'table' | 'file')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="table" id="source-table" />
                          <Label htmlFor="source-table" className="cursor-pointer">Use filtered table data</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="file" id="source-file" />
                          <Label htmlFor="source-file" className="cursor-pointer">Upload CSV file</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {sourceType === 'table' ? (
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
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Label>Upload CSV File:</Label>
                        <div className="flex items-center gap-2">
                          <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="csv-upload" className="sr-only">Upload CSV</Label>
                            <input
                              id="csv-upload"
                              type="file"
                              accept=".csv"
                              onChange={handleFileChange}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                        </div>
                        {uploadedFile && (
                          <div className="bg-muted p-4 rounded-md">
                            <div className="flex items-start gap-2">
                              <FileCode2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                              <div className="text-sm space-y-1">
                                <p className="font-medium">Selected: {uploadedFile.name}</p>
                                <p className="text-muted-foreground">
                                  {(uploadedFile.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-3">
                      <Label>Select Scraper:</Label>
                      <RadioGroup value={selectedScraper} onValueChange={(value) => setSelectedScraper(value as ScraperType)}>
                        <div className="flex items-start space-x-2 border rounded-lg p-3">
                          <RadioGroupItem value="amazon" id="amazon" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="amazon" className="font-medium cursor-pointer">
                              Amazon Scraper (Python)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Legacy Python scraper. Requires Python environment.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                          <RadioGroupItem value="amazon_js" id="amazon_js" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="amazon_js" className="font-medium cursor-pointer flex items-center gap-2">
                              Amazon Scraper (JS) <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Experimental</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Runs directly in the app using Playwright (Node.js). No Python required.
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
                    {sourceType === 'table' && (
                      <Button 
                        variant="outline" 
                        onClick={handleExportCSV} 
                        disabled={filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription)}
                        className="w-full sm:w-auto"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV Only
                      </Button>
                    )}
                    <Button 
                      onClick={handleRunScraper} 
                      disabled={
                        (sourceType === 'table' && (filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription))) ||
                        (sourceType === 'file' && !uploadedFile)
                      }
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
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scraper Instructions</DialogTitle>
            <DialogDescription>
              How to use the local scraper feature safely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Prerequisites</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Python 3.x installed</li>
                <li>Dependencies: playwright, pandas</li>
                <li>Playwright browsers installed (<code>playwright install</code>)</li>
              </ul>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Running from App</h4>
              <p className="text-sm text-muted-foreground">
                If you have the environment set up, you can run scrapers directly from this dialog. The app will execute the Python scripts in the background and stream the output.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Manual Execution (Recommended for large datasets)</h4>
              <p className="text-sm text-muted-foreground">
                For better control or debugging, you can export the data and run the scripts manually:
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Click "Export CSV Only" to get the products file</li>
                <li>Move the file to the project root folder</li>
                <li>Run: <code>python scraper_amazon.py [input_file] [output_file]</code></li>
                <li>Import the result back using "Import CSV"</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
