"use client";

import { useState, useRef } from "react";
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
import { Upload, FileUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import { Product } from "@/lib/schema";

interface ImportDialogProps {
  onImport: (products: Product[]) => void;
}

export function ImportDialog({ onImport }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Product[]>([]);
  const [error, setError] = useState<string>("");
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

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Product[];
        setPreview(data.slice(0, 5)); // Show first 5 rows
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleImport = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Product[];
        onImport(data);
        setOpen(false);
        setFile(null);
        setPreview([]);
      },
      error: (err) => {
        setError(`Error importing CSV: ${err.message}`);
      },
    });
  };

  const handleReset = () => {
    setFile(null);
    setPreview([]);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import products. The file should have the same structure as your current data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <FileUp className="mr-2 h-4 w-4" />
                {file ? file.name : "Choose CSV file"}
              </Button>
              {file && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Preview (first 5 rows)</h4>
              <div className="text-xs text-muted-foreground mb-2">
                Total rows to import: {preview.length > 0 ? "Processing..." : 0}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(preview[0] || {}).slice(0, 5).map((key) => (
                        <th key={key} className="text-left p-2 font-medium">
                          {key}
                        </th>
                      ))}
                      <th className="text-left p-2 font-medium">...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.values(row).slice(0, 5).map((val, i) => (
                          <td key={i} className="p-2 max-w-[150px] truncate">
                            {String(val)}
                          </td>
                        ))}
                        <td className="p-2">...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file}>
            Import Products
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
