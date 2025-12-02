"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, GitMerge, ArrowRight, CheckCircle2, Database, FileSpreadsheet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Papa from "papaparse";
import { Product } from "@/lib/schema";
import { toast } from "sonner";

interface DataManagementDialogProps {
  currentProducts: Product[];
  onUpdate: (products: Product[]) => void;
}

// Helper to expand scientific notation
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

export function DataManagementDialog({ currentProducts, onUpdate }: DataManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("import");
  
  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Product[]>([]);
  
  // Merge State
  const [mergeFile, setMergeFile] = useState<File | null>(null);
  const [masterData, setMasterData] = useState<any[]>([]);
  const [masterColumns, setMasterColumns] = useState<string[]>([]);
  const [matchKey, setMatchKey] = useState<string>("Product");
  const [updateKeys, setUpdateKeys] = useState<string[]>(["Barcode"]);
  const [mergeStep, setMergeStep] = useState<1 | 2>(1);

  const importInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // --- Import Logic ---
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transform: (value: string, field: string | number) => {
        if (field === "Barcode") return expandScientificNotation(value);
        return value.trim();
      },
      complete: (results) => {
        const data = results.data as Product[];
        setImportPreview(data.slice(0, 5));
      },
      error: (err) => toast.error(`Error parsing CSV: ${err.message}`),
    });
  };

  const handleImport = () => {
    if (!importFile) return;

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transform: (value: string, field: string | number) => {
        if (field === "Barcode") return expandScientificNotation(value);
        return value.trim();
      },
      complete: (results) => {
        const data = results.data as Product[];
        onUpdate(data);
        setOpen(false);
        toast.success(`Imported ${data.length} products successfully`);
        resetDialog();
      },
      error: (err) => toast.error(`Error importing CSV: ${err.message}`),
    });
  };

  // --- Merge Logic ---
  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setMergeFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transform: (value: string, field: string | number) => {
        if (field === "Barcode") return expandScientificNotation(value);
        return value.trim();
      },
      complete: (results) => {
        const data = results.data as any[];
        if (data.length > 0) {
          setMasterData(data);
          setMasterColumns(Object.keys(data[0]));
          setMergeStep(2);
        } else {
          toast.error("CSV file is empty");
        }
      },
      error: (err) => toast.error(`Error parsing CSV: ${err.message}`),
    });
  };

  const handleMerge = () => {
    if (!masterData.length || !matchKey || updateKeys.length === 0) return;

    let matchedCount = 0;
    let updatedCount = 0;

    const masterMap = new Map<string, any>();
    masterData.forEach(row => {
      const key = row[matchKey];
      if (key) masterMap.set(String(key).toLowerCase().trim(), row);
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

    onUpdate(newProducts);
    setOpen(false);
    toast.success(`Merge Complete!`, {
      description: `Matched: ${matchedCount} | Updated: ${updatedCount} products`
    });
    resetDialog();
  };

  const resetDialog = () => {
    setImportFile(null);
    setImportPreview([]);
    setMergeFile(null);
    setMasterData([]);
    setMasterColumns([]);
    setMergeStep(1);
    if (importInputRef.current) importInputRef.current.value = "";
    if (mergeInputRef.current) mergeInputRef.current.value = "";
  };

  const toggleUpdateKey = (key: string) => {
    setUpdateKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Database className="mr-2 h-4 w-4" />
          Manage Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Data Management</DialogTitle>
          <DialogDescription>
            Import new data or merge updates from external CSV files.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Products</TabsTrigger>
            <TabsTrigger value="merge">Merge & Update</TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Upload Product CSV</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => importInputRef.current?.click()}
                  className="w-full h-24 border-dashed flex flex-col gap-2"
                >
                  <FileUp className="h-8 w-8 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {importFile ? importFile.name : "Click to upload CSV"}
                  </span>
                </Button>
              </div>
            </div>

            {importPreview.length > 0 && (
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Preview (first 5 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(importPreview[0] || {}).slice(0, 5).map((key) => (
                          <th key={key} className="text-left p-2 font-medium">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).slice(0, 5).map((val, i) => (
                            <td key={i} className="p-2 max-w-[150px] truncate">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={!importFile}>Import Data</Button>
            </div>
          </TabsContent>

          {/* MERGE TAB */}
          <TabsContent value="merge" className="space-y-4 py-4">
            {mergeStep === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Upload Master CSV (Source of Truth)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={mergeInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleMergeFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => mergeInputRef.current?.click()}
                      className="w-full h-24 border-dashed flex flex-col gap-2"
                    >
                      <GitMerge className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">Click to upload master file</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{mergeFile?.name}</span>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              {mergeStep === 2 && (
                <Button onClick={handleMerge} disabled={updateKeys.length === 0}>
                  Merge Data
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
