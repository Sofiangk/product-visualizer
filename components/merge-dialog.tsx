"use client";

import { useState, useRef, useMemo } from "react";
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
import { Upload, FileUp, GitMerge, ArrowRight, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import Papa from "papaparse";
import { Product } from "@/lib/schema";

interface MergeDialogProps {
  currentProducts: Product[];
  onMerge: (products: Product[]) => void;
}

// Helper to expand scientific notation (reused from ImportDialog logic)
function expandScientificNotation(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+$/.test(trimmed)) {
    try {
      const number = Number(trimmed);
      if (!isNaN(number)) {
        return number.toLocaleString('fullwide', { useGrouping: false });
      }
    } catch (e) {
      return trimmed;
    }
  }
  return trimmed;
}

export function MergeDialog({ currentProducts, onMerge }: MergeDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [masterData, setMasterData] = useState<any[]>([]);
  const [masterColumns, setMasterColumns] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  
  // Merge Configuration
  const [matchKey, setMatchKey] = useState<string>("Product");
  const [updateKeys, setUpdateKeys] = useState<string[]>(["Barcode"]);
  const [step, setStep] = useState<1 | 2>(1); // 1: Upload, 2: Configure
  const [mergeStats, setMergeStats] = useState<{ matched: number; updated: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError("");

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transform: (value: string, field: string | number) => {
        if (field === "Barcode") {
          return expandScientificNotation(value);
        }
        return value.trim();
      },
      complete: (results) => {
        const data = results.data as any[];
        if (data.length > 0) {
          setMasterData(data);
          setMasterColumns(Object.keys(data[0]));
          setStep(2);
        } else {
          setError("CSV file is empty");
        }
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleMerge = () => {
    if (!masterData.length || !matchKey || updateKeys.length === 0) return;

    let matchedCount = 0;
    let updatedCount = 0;

    // Create a map for faster lookup
    const masterMap = new Map<string, any>();
    masterData.forEach(row => {
      const key = row[matchKey];
      if (key) {
        masterMap.set(String(key).toLowerCase().trim(), row);
      }
    });

    const newProducts = currentProducts.map(product => {
      const productKey = String(product[matchKey as keyof Product] || "").toLowerCase().trim();
      const masterRow = masterMap.get(productKey);

      if (masterRow) {
        matchedCount++;
        const updatedProduct = { ...product };
        let hasUpdates = false;

        updateKeys.forEach(key => {
          const newValue = masterRow[key];
          // Only update if new value exists and is different
          if (newValue && newValue !== product[key as keyof Product]) {
            (updatedProduct as any)[key] = newValue;
            hasUpdates = true;
          }
        });

        if (hasUpdates) updatedCount++;
        return updatedProduct;
      }
      return product;
    });

    onMerge(newProducts);
    setMergeStats({ matched: matchedCount, updated: updatedCount });
    
    // Reset after short delay or keep open to show stats? 
    // Let's show stats then close manually or auto-close
    setTimeout(() => {
      alert(`Merge Complete!\nMatched: ${matchedCount} products\nUpdated: ${updatedCount} products`);
      setOpen(false);
      resetDialog();
    }, 500);
  };

  const resetDialog = () => {
    setFile(null);
    setMasterData([]);
    setMasterColumns([]);
    setError("");
    setStep(1);
    setMergeStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleUpdateKey = (key: string) => {
    setUpdateKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <GitMerge className="mr-2 h-4 w-4" />
          Merge CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Data from Master CSV</DialogTitle>
          <DialogDescription>
            Update your current products using data from another CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="merge-file">Upload Master CSV</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    id="merge-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-dashed flex flex-col gap-2"
                  >
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground">Click to upload master file</span>
                  </Button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{file?.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={resetDialog} className="h-6 text-xs">
                  Change File
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>1. Match Rows By</Label>
                  <Select value={matchKey} onValueChange={setMatchKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This column must exist in both files (e.g., Product Name or SKU).
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>2. Columns to Update</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {masterColumns.map(col => (
                        <div key={col} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`col-${col}`} 
                            checked={updateKeys.includes(col)}
                            onCheckedChange={() => toggleUpdateKey(col)}
                            disabled={col === matchKey}
                          />
                          <Label htmlFor={`col-${col}`} className="text-sm font-normal cursor-pointer">
                            {col}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md text-sm text-blue-900 dark:text-blue-100">
                <p className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Will update <strong>{updateKeys.length} columns</strong> for products where <strong>{matchKey}</strong> matches.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {step === 2 && (
            <Button onClick={handleMerge} disabled={updateKeys.length === 0}>
              Merge Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
