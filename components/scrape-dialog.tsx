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
import { Input } from "@/components/ui/input";
import { Sparkles, Download, Upload, Info, FileCode2, Play, Loader2, CheckCircle2, XCircle, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Papa from "papaparse";
import { Product } from "@/lib/schema";
import { migrateImage } from "@/app/actions/migration";

interface ScrapeDialogProps {
  products: Product[];
  onDataChange?: (products: Product[]) => void;
}

type ScraperType = 'amazon' | 'amazon_js' | 'additional_images' | 'additional_images_js' | 'migrate_images';
type ScraperStatus = 'idle' | 'running' | 'success' | 'error';

export function ScrapeDialog({ products, onDataChange }: ScrapeDialogProps) {
  const [open, setOpen] = useState(false);
  const [showDevWarning, setShowDevWarning] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [sourceType, setSourceType] = useState<'table' | 'file'>('table');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filterMissingImage, setFilterMissingImage] = useState(true);
  const [filterMissingDescription, setFilterMissingDescription] = useState(true);
  const [selectedScraper, setSelectedScraper] = useState<ScraperType>('amazon_js');
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus>('idle');
  const [scraperOutput, setScraperOutput] = useState<string[]>([]);
  const [showExportInstructions, setShowExportInstructions] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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

  const handleStopScraper = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setScraperStatus('error');
      setScraperOutput(prev => [...prev, '\n⚠ Scraping stopped by user']);
    }
  };

  const handleRunScraper = async () => {
    let csvData = "";
    
    // Handle Migration Logic Separate Path
    if (selectedScraper === 'migrate_images') {
         setScraperStatus('running');
         setScraperOutput([]);

         const totalProducts = sourceType === 'table' ? filteredProducts.length : 0;
         let targetProducts = filteredProducts;
         
         if (sourceType === 'file') {
             if (!uploadedFile) { alert("Please select a CSV file"); return; }
             try {
                const text = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(uploadedFile);
                });
                const parsed = Papa.parse(text, { header: true });
                if (parsed.data) {
                    targetProducts = parsed.data as Product[];
                }
             } catch (e) {
                 console.error(e);
                 setScraperStatus('error');
                 setScraperOutput(['Error parsing CSV file']);
                 return;
             }
         }

         if (targetProducts.length === 0) {
             alert(sourceType === 'table' ? "No products match criteria" : "No products found in file");
             setScraperStatus('idle');
             return;
         }

         setScraperOutput(prev => [...prev, `Starting migration for ${targetProducts.length} products...`]);
         
         const migratedProducts: Product[] = [];
         let successCount = 0;
         let skipCount = 0;
         let errorCount = 0;

         for (let i = 0; i < targetProducts.length; i++) {
             const product = { ...targetProducts[i] };
             const productId = product.ID || product.Product || `p-${i}`;
             const category = product["Main Category (EN)"] || "uncategorized";
             
             setScraperOutput(prev => {
                 const last = prev[prev.length - 1];
                 const msg = `Processing ${i+1}/${targetProducts.length}: ${product.Product || 'Unknown Product'}`;
                 if (last?.startsWith("Processing")) return [...prev.slice(0, -1), msg];
                 return [...prev, msg];
             });

             // Migrate Main Image
             if (product.Image && product.Image.trim()) {
                 const result = await migrateImage(product.Image, productId, category, 'main');
                 if (result.success && result.newUrl) {
                     product.Image = result.newUrl;
                     if (result.skipped) skipCount++; else successCount++;
                 } else {
                     errorCount++;
                     setScraperOutput(prev => [...prev, `  ✗ Failed main image: ${result.error || 'Unknown error'}`]);
                 }
             }

             // Migrate Additional Images
             if (product["Additional Images"] && product["Additional Images"].trim()) {
                 const urls = product["Additional Images"].split('|').filter(u => u.trim());
                 const newUrls: string[] = [];
                 
                 for (let j = 0; j < urls.length; j++) {
                     const result = await migrateImage(urls[j], productId, category, 'additional', j);
                     if (result.success && result.newUrl) {
                         newUrls.push(result.newUrl);
                         if (result.skipped) skipCount++; else successCount++;
                     } else {
                         newUrls.push(urls[j]); // Keep original if failed
                         errorCount++;
                         setScraperOutput(prev => [...prev, `  ✗ Failed additional image ${j+1}: ${result.error || 'Unknown error'}`]);
                     }
                 }
                 product["Additional Images"] = newUrls.join('|');
             }
             
             migratedProducts.push(product);
             // Allow UI to update
             await new Promise(r => setTimeout(r, 0));
         }

         setScraperStatus('success');
         setScraperOutput(prev => [
             ...prev.filter(l => !l.startsWith("Processing")), 
             `\n✓ Migration Completed!`,
             `  - Processed: ${targetProducts.length} products`,
             `  - Images Uploaded/Verified: ${successCount + skipCount}`,
             `  - Errors: ${errorCount}`
         ]);
         
         if (onDataChange) {
             onDataChange(migratedProducts);
         }
          return;
     }

     // Handle Additional Images JS Scraper
     if (selectedScraper === 'additional_images_js') {
        setScraperStatus('running');
        setScraperOutput([]);

        let targetProducts = filteredProducts;
        
        if (sourceType === 'file') {
            if (!uploadedFile) { alert("Please select a CSV file"); return; }
            try {
               const text = await new Promise<string>((resolve, reject) => {
                   const reader = new FileReader();
                   reader.onload = (e) => resolve(e.target?.result as string);
                   reader.onerror = (e) => reject(e);
                   reader.readAsText(uploadedFile);
               });
               const parsed = Papa.parse(text, { header: true });
               if (parsed.data) {
                   targetProducts = parsed.data as Product[];
               }
            } catch (e) {
                console.error(e);
                setScraperStatus('error');
                setScraperOutput(['Error parsing CSV file']);
                return;
            }
        }

        if (targetProducts.length === 0) {
            alert(sourceType === 'table' ? "No products match criteria" : "No products found in file");
            setScraperStatus('idle');
            return;
        }

        const controller = new AbortController();
        setAbortController(controller);

        try {
            const response = await fetch('/api/scrape-additional-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: targetProducts }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setScraperStatus('success');
            setScraperOutput(prev => [...prev, '\n✓ Additional Images scraping completed successfully!', `\n${result.message}`]);
            
            if (onDataChange && result.products) {
                onDataChange(result.products);
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Already handled by handleStopScraper
                return;
            }
            setScraperStatus('error');
            setScraperOutput(prev => [...prev, `\n✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        }
        return;
     }

     // Standard Scraper Logic
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

    const controller = new AbortController();
    setAbortController(controller);

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
        signal: controller.signal,
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
      
      // Check if it's a setup error with instructions
      if (error instanceof Error) {
        try {
          const errorResponse = await fetch('/api/scrape', { method: 'POST', body: JSON.stringify({}) })
            .then(r => r.json());
          
          if (errorResponse.setup) {
            setScraperOutput(prev => [
              ...prev, 
              `\n✗ Setup Required: ${errorResponse.error}`,
              `\n📋 Instructions: ${errorResponse.setup}`
            ]);
          } else {
            setScraperOutput(prev => [...prev, `\n✗ Error: ${error.message}`]);
          }
        } catch {
          setScraperOutput(prev => [...prev, `\n✗ Error: ${error.message}`]);
        }
      } else {
        setScraperOutput(prev => [...prev, `\n✗ Error: Unknown error`]);
      }
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
            <span className="hidden sm:inline">Data Tools</span>
            <span className="sm:hidden">Tools</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1.5 text-left">
              <DialogTitle>Data Tools</DialogTitle>
              <DialogDescription>
                Running scrapers or migrating images.
              </DialogDescription>
            </div>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1"
                onClick={() => setShowHelp(true)}
                title="Instructions"
              >
                <Info className="h-5 w-5" />
              </Button>
            )}
          </DialogHeader>

          {!isAuthenticated ? (
            <div className="py-6 space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 p-4 rounded-lg flex gap-3">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-900 dark:text-amber-200">Password Required</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Please enter the password to access Data Tools.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const correctPassword = process.env.NEXT_PUBLIC_DATA_TOOLS_PASSWORD || 'admin123';
                      if (password === correctPassword) {
                        setIsAuthenticated(true);
                        setPasswordError('');
                      } else {
                        setPasswordError('Incorrect password');
                      }
                    }
                  }}
                  placeholder="Enter password"
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  const correctPassword = process.env.NEXT_PUBLIC_DATA_TOOLS_PASSWORD || 'admin123';
                  if (password === correctPassword) {
                    setIsAuthenticated(true);
                    setPasswordError('');
                  } else {
                    setPasswordError('Incorrect password');
                  }
                }}>
                  Continue
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
                        <Label>Filter criteria:</Label>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="missing-image"
                              checked={filterMissingImage}
                              onCheckedChange={(checked) => setFilterMissingImage(checked as boolean)}
                            />
                            <Label htmlFor="missing-image" className="font-normal cursor-pointer">
                              Missing Images
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="missing-description"
                              checked={filterMissingDescription}
                              onCheckedChange={(checked) => setFilterMissingDescription(checked as boolean)}
                            />
                            <Label htmlFor="missing-description" className="font-normal cursor-pointer">
                              Missing Descriptions
                            </Label>
                          </div>
                        </div>

                        <div className="bg-muted p-4 rounded-md">
                          <div className="flex items-start gap-2">
                            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="text-sm space-y-1">
                              <p className="font-medium">
                                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} matched
                              </p>
                              <p className="text-muted-foreground">
                                Select an operation below to process these products.
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
                      <Label>Select Operation:</Label>
                      <RadioGroup value={selectedScraper} onValueChange={(value) => setSelectedScraper(value as ScraperType)}>
                        
                        {/* JS Scraper (Default) */}
                        <div className="flex items-start space-x-2 border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                          <RadioGroupItem value="amazon_js" id="amazon_js" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="amazon_js" className="font-medium cursor-pointer flex items-center gap-2">
                              Amazon Scraper (In-App) <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">Recommended</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Runs directly in your browser. Extracts data from Amazon.sa.
                            </p>
                          </div>
                        </div>

                        {/* Additional Images JS Scraper */}
                        <div className="flex items-start space-x-2 border rounded-lg p-3 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                          <RadioGroupItem value="additional_images_js" id="additional_images_js" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="additional_images_js" className="font-medium cursor-pointer flex items-center gap-2">
                              Additional Images (In-App)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Scrapes multiple product images and Arabic names from Amazon.
                            </p>
                          </div>
                        </div>

                        {/* Image Migration (Lightsail) */}
                        <div className="flex items-start space-x-2 border rounded-lg p-3 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                          <RadioGroupItem value="migrate_images" id="migrate_images" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="migrate_images" className="font-medium cursor-pointer flex items-center gap-2">
                              Image Migration (Lightsail)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Downloads images and uploads them to your configured AWS Lightsail bucket.
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
                    
                    {/* Export CSV Button - always available for table source */}
                    {sourceType === 'table' && (
                      <Button 
                        variant="outline" 
                        onClick={handleExportCSV} 
                        disabled={filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription)}
                        className="w-full sm:w-auto"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV Data
                      </Button>
                    )}

                    {/* Action Button: Run (JS) or Download (Python) */}
                    {(selectedScraper === 'amazon_js' || selectedScraper === 'additional_images_js' || selectedScraper === 'migrate_images') ? (
                      <Button 
                        onClick={handleRunScraper} 
                        disabled={
                          (sourceType === 'table' && (filteredProducts.length === 0 || (!filterMissingImage && !filterMissingDescription && selectedScraper !== 'migrate_images'))) ||
                          (sourceType === 'file' && !uploadedFile)
                        }
                        className="w-full sm:w-auto"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {selectedScraper === 'migrate_images' ? 'Start Migration' : 'Run Scraper (In-App)'}
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          const scriptName = selectedScraper === 'amazon' ? 'scraper_amazon.py' : 'scraper_additional_images.py';
                          const link = document.createElement("a");
                          link.href = `/${scriptName}`; 
                          link.setAttribute("download", scriptName);
                          // link.click(); // If we want to auto-download
                          // For now, redirect to export instructions
                           setShowExportInstructions(true);
                        }}
                        className="w-full sm:w-auto"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Python Script
                      </Button>
                    )}
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
                          {scraperStatus === 'running' && 'Processing...'}
                          {scraperStatus === 'success' && 'Operation Completed!'}
                          {scraperStatus === 'error' && 'Operation Failed'}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {scraperStatus === 'running' && 'Please wait while we process your request...'}
                        {scraperStatus === 'success' && 'Data has been updated successfully.'}
                        {scraperStatus === 'error' && 'An error occurred. Check the logs below.'}
                      </p>
                    </div>

                    <div>
                      <Label className="mb-2 block">Logs:</Label>
                      <ScrollArea className="h-[300px] w-full border rounded-md p-4 bg-muted/50">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {scraperOutput.join('\n')}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>

                  <DialogFooter>
                    {scraperStatus === 'running' ? (
                      <Button variant="destructive" onClick={handleStopScraper} className="w-full sm:w-auto">
                        <XCircle className="mr-2 h-4 w-4" />
                        Stop Scraper
                      </Button>
                    ) : (
                      <Button onClick={() => {
                        // If success, keep the data change but close dialog
                         if (scraperStatus === 'success') {
                            setOpen(false);
                         }
                        resetDialog();
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
                        ✓ Instructions
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        To run the Python scraper manually:
                      </p>
                    </div>

                    <div className="space-y-4">
                      
                      <div className="space-y-3 text-sm">
                        <ol className="list-decimal list-inside space-y-2">
                          <li>Export the CSV data first using "Export CSV Data"</li>
                          <li>Download the script: 
                            <a href={`/${selectedScraper === 'amazon' ? 'scraper_amazon.py' : 'scraper_additional_images.py'}`} download className="ml-1 text-blue-600 underline">
                                Click here to download script
                            </a>
                          </li>
                          <li>Run locally: <code className="bg-muted px-1 rounded">python {selectedScraper === 'amazon' ? 'scraper_amazon.py' : 'scraper_additional_images.py'} [filename]</code></li>
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
            <DialogTitle>Instructions</DialogTitle>
            <DialogDescription>
              How to use the data tools.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <h4 className="font-medium">Web Scraper</h4>
             <p className="text-sm text-muted-foreground">
                 The In-App scraper runs directly in your browser/server (Node.js) to fetch data from Amazon.sa. It is the recommended way to enrich your product data.
             </p>

             <Separator />
             <h4 className="font-medium">Image Migration (Lightsail)</h4>
             <p className="text-sm text-muted-foreground">
                 This tool downloads images from their current external URLs and uploads them to your configured AWS Lightsail Object Storage bucket. It updates your product data with the new S3 URLs.
             </p>
             <Separator />
             <h4 className="font-medium">Legacy Python Tools</h4>
             <p className="text-sm text-muted-foreground mb-3">
                 The original Python scrapers are available for manual use if needed.
             </p>
             <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start h-auto py-2 px-3" asChild>
                    <a href="/scraper_amazon.py" download="scraper_amazon.py">
                        <Download className="mr-2 h-4 w-4" />
                        <div className="text-left">
                            <div className="font-medium">Download Amazon Scraper</div>
                            <div className="text-xs text-muted-foreground">Python script for Amazon.sa</div>
                        </div>
                    </a>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2 px-3" asChild>
                    <a href="/scraper_additional_images.py" download="scraper_additional_images.py">
                        <Download className="mr-2 h-4 w-4" />
                        <div className="text-left">
                            <div className="font-medium">Download Additional Images Scraper</div>
                            <div className="text-xs text-muted-foreground">Python script for fetching extra images</div>
                        </div>
                    </a>
                </Button>
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
