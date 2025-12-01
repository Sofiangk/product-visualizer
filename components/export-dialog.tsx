"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Papa from "papaparse";
import { Download } from "lucide-react";

interface ExportDialogProps {
  products: Product[];
  selectedRows?: Product[]; // Add selectedRows prop
}

const ALL_COLUMNS = [
  "ID",
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
  const [allMainCategories, setAllMainCategories] = useState(true);
  const [allSubCategories, setAllSubCategories] = useState(true);
  const [allRows, setAllRows] = useState(true);
  const [selectedMainCategories, setSelectedMainCategories] = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [rowLimit, setRowLimit] = useState<string>("");
  const [filterMissingImages, setFilterMissingImages] = useState(false);
  const [filterMissingDescriptions, setFilterMissingDescriptions] = useState(false);
  const [filterWithImages, setFilterWithImages] = useState(false);
  const [filterWithDescriptions, setFilterWithDescriptions] = useState(false);

  // Get unique categories from products
  const uniqueCategories = useMemo(() => {
    const mainCats = new Set<string>();
    const subCatsByMain = new Map<string, Set<string>>();
    
    products.forEach((product) => {
      const mainCat = product["Main Category (EN)"];
      const subCat = product["Sub-Category (EN)"];
      
      if (mainCat) {
        mainCats.add(mainCat);
        if (subCat) {
          if (!subCatsByMain.has(mainCat)) {
            subCatsByMain.set(mainCat, new Set());
          }
          subCatsByMain.get(mainCat)!.add(subCat);
        }
      }
    });
    
    return {
      mainCategories: Array.from(mainCats).sort(),
      subCategoriesByMain: subCatsByMain,
    };
  }, [products]);

  // Get available sub-categories for selected main categories
  const availableSubCategories = useMemo(() => {
    if (allMainCategories || selectedMainCategories.length === 0) {
      // If all main categories or none selected, show all sub-categories
      const allSubCats = new Set<string>();
      uniqueCategories.subCategoriesByMain.forEach((subCats) => {
        subCats.forEach((subCat) => allSubCats.add(subCat));
      });
      return Array.from(allSubCats).sort();
    }
    
    // Get sub-categories for selected main categories
    const allSubCats = new Set<string>();
    selectedMainCategories.forEach((mainCat) => {
      const subCats = uniqueCategories.subCategoriesByMain.get(mainCat);
      if (subCats) {
        subCats.forEach((subCat) => allSubCats.add(subCat));
      }
    });
    return Array.from(allSubCats).sort();
  }, [allMainCategories, selectedMainCategories, uniqueCategories]);

  // Calculate filtered row count for preview
  const filteredRowCount = useMemo(() => {
    let data = exportScope === "selected" && selectedRows?.length ? selectedRows : products;
    
    // Apply main category filter
    if (!allMainCategories && selectedMainCategories.length > 0) {
      data = data.filter((product) => 
        selectedMainCategories.includes(product["Main Category (EN)"] || "")
      );
    }
    
    // Apply sub-category filter
    if (!allSubCategories && selectedSubCategories.length > 0) {
      data = data.filter((product) => 
        selectedSubCategories.includes(product["Sub-Category (EN)"] || "")
      );
    }
    
    // Apply image filters (mutually exclusive)
    if (filterMissingImages) {
      data = data.filter((product) => {
        const image = product.Image || "";
        const additionalImages = product["Additional Images"] || "";
        const hasImage = image.trim() !== "" && 
                        image.toLowerCase() !== "nan" && 
                        image !== "NaN" && 
                        image !== "None";
        const hasAdditionalImages = additionalImages.trim() !== "" && 
                                    additionalImages.toLowerCase() !== "nan" && 
                                    additionalImages !== "NaN" && 
                                    additionalImages !== "None";
        return !hasImage && !hasAdditionalImages;
      });
    } else if (filterWithImages) {
      data = data.filter((product) => {
        const image = product.Image || "";
        const additionalImages = product["Additional Images"] || "";
        const hasImage = image.trim() !== "" && 
                        image.toLowerCase() !== "nan" && 
                        image !== "NaN" && 
                        image !== "None";
        const hasAdditionalImages = additionalImages.trim() !== "" && 
                                    additionalImages.toLowerCase() !== "nan" && 
                                    additionalImages !== "NaN" && 
                                    additionalImages !== "None";
        return hasImage || hasAdditionalImages;
      });
    }
    
    // Apply description filters (mutually exclusive)
    if (filterMissingDescriptions) {
      data = data.filter((product) => {
        const shortDescEn = product["Short Description En"] || "";
        const longDescEn = product["Long Description En"] || "";
        const shortDescAr = product["Short Description Ar"] || "";
        const longDescAr = product["Long Description Ar"] || "";
        
        const hasDescription = 
          (shortDescEn.trim() !== "" && shortDescEn.toLowerCase() !== "nan" && shortDescEn !== "NaN" && shortDescEn !== "None") ||
          (longDescEn.trim() !== "" && longDescEn.toLowerCase() !== "nan" && longDescEn !== "NaN" && longDescEn !== "None") ||
          (shortDescAr.trim() !== "" && shortDescAr.toLowerCase() !== "nan" && shortDescAr !== "NaN" && shortDescAr !== "None") ||
          (longDescAr.trim() !== "" && longDescAr.toLowerCase() !== "nan" && longDescAr !== "NaN" && longDescAr !== "None");
        
        return !hasDescription;
      });
    } else if (filterWithDescriptions) {
      data = data.filter((product) => {
        const shortDescEn = product["Short Description En"] || "";
        const longDescEn = product["Long Description En"] || "";
        const shortDescAr = product["Short Description Ar"] || "";
        const longDescAr = product["Long Description Ar"] || "";
        
        const hasDescription = 
          (shortDescEn.trim() !== "" && shortDescEn.toLowerCase() !== "nan" && shortDescEn !== "NaN" && shortDescEn !== "None") ||
          (longDescEn.trim() !== "" && longDescEn.toLowerCase() !== "nan" && longDescEn !== "NaN" && longDescEn !== "None") ||
          (shortDescAr.trim() !== "" && shortDescAr.toLowerCase() !== "nan" && shortDescAr !== "NaN" && shortDescAr !== "None") ||
          (longDescAr.trim() !== "" && longDescAr.toLowerCase() !== "nan" && longDescAr !== "NaN" && longDescAr !== "None");
        
        return hasDescription;
      });
    }
    
    // Apply row limit
    if (!allRows && rowLimit) {
      const limit = parseInt(rowLimit, 10);
      if (!isNaN(limit) && limit > 0) {
        return Math.min(data.length, limit);
      }
    }
    
    return data.length;
  }, [products, selectedRows, exportScope, allMainCategories, selectedMainCategories, allSubCategories, selectedSubCategories, allRows, rowLimit, filterMissingImages, filterMissingDescriptions, filterWithImages, filterWithDescriptions]);

  const handleToggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const handleToggleMainCategory = (category: string) => {
    setSelectedMainCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      return [...prev, category];
    });
  };

  const handleToggleSubCategory = (subCategory: string) => {
    setSelectedSubCategories((prev) => {
      if (prev.includes(subCategory)) {
        return prev.filter((c) => c !== subCategory);
      }
      return [...prev, subCategory];
    });
  };

  const handleAllMainCategoriesChange = (checked: boolean) => {
    setAllMainCategories(checked);
    if (checked) {
      setSelectedMainCategories([]);
    }
  };

  const handleAllSubCategoriesChange = (checked: boolean) => {
    setAllSubCategories(checked);
    if (checked) {
      setSelectedSubCategories([]);
    }
  };

  const handleAllRowsChange = (checked: boolean) => {
    setAllRows(checked);
    if (checked) {
      setRowLimit("");
    }
  };

  const handleExport = async () => {
    let sourceData = exportScope === "selected" && selectedRows?.length ? selectedRows : products;
    
    // Apply main category filter
    if (!allMainCategories && selectedMainCategories.length > 0) {
      sourceData = sourceData.filter((product) =>
        selectedMainCategories.includes(product["Main Category (EN)"] || "")
      );
    }
    
    // Apply sub-category filter
    if (!allSubCategories && selectedSubCategories.length > 0) {
      sourceData = sourceData.filter((product) =>
        selectedSubCategories.includes(product["Sub-Category (EN)"] || "")
      );
    }
    
    // Apply image filters (mutually exclusive)
    if (filterMissingImages) {
      sourceData = sourceData.filter((product) => {
        const image = product.Image || "";
        const additionalImages = product["Additional Images"] || "";
        const hasImage = image.trim() !== "" && 
                        image.toLowerCase() !== "nan" && 
                        image !== "NaN" && 
                        image !== "None";
        const hasAdditionalImages = additionalImages.trim() !== "" && 
                                    additionalImages.toLowerCase() !== "nan" && 
                                    additionalImages !== "NaN" && 
                                    additionalImages !== "None";
        return !hasImage && !hasAdditionalImages;
      });
    } else if (filterWithImages) {
      sourceData = sourceData.filter((product) => {
        const image = product.Image || "";
        const additionalImages = product["Additional Images"] || "";
        const hasImage = image.trim() !== "" && 
                        image.toLowerCase() !== "nan" && 
                        image !== "NaN" && 
                        image !== "None";
        const hasAdditionalImages = additionalImages.trim() !== "" && 
                                    additionalImages.toLowerCase() !== "nan" && 
                                    additionalImages !== "NaN" && 
                                    additionalImages !== "None";
        return hasImage || hasAdditionalImages;
      });
    }
    
    // Apply description filters (mutually exclusive)
    if (filterMissingDescriptions) {
      sourceData = sourceData.filter((product) => {
        const shortDescEn = product["Short Description En"] || "";
        const longDescEn = product["Long Description En"] || "";
        const shortDescAr = product["Short Description Ar"] || "";
        const longDescAr = product["Long Description Ar"] || "";
        
        const hasDescription = 
          (shortDescEn.trim() !== "" && shortDescEn.toLowerCase() !== "nan" && shortDescEn !== "NaN" && shortDescEn !== "None") ||
          (longDescEn.trim() !== "" && longDescEn.toLowerCase() !== "nan" && longDescEn !== "NaN" && longDescEn !== "None") ||
          (shortDescAr.trim() !== "" && shortDescAr.toLowerCase() !== "nan" && shortDescAr !== "NaN" && shortDescAr !== "None") ||
          (longDescAr.trim() !== "" && longDescAr.toLowerCase() !== "nan" && longDescAr !== "NaN" && longDescAr !== "None");
        
        return !hasDescription;
      });
    } else if (filterWithDescriptions) {
      sourceData = sourceData.filter((product) => {
        const shortDescEn = product["Short Description En"] || "";
        const longDescEn = product["Long Description En"] || "";
        const shortDescAr = product["Short Description Ar"] || "";
        const longDescAr = product["Long Description Ar"] || "";
        
        const hasDescription = 
          (shortDescEn.trim() !== "" && shortDescEn.toLowerCase() !== "nan" && shortDescEn !== "NaN" && shortDescEn !== "None") ||
          (longDescEn.trim() !== "" && longDescEn.toLowerCase() !== "nan" && longDescEn !== "NaN" && longDescEn !== "None") ||
          (shortDescAr.trim() !== "" && shortDescAr.toLowerCase() !== "nan" && shortDescAr !== "NaN" && shortDescAr !== "None") ||
          (longDescAr.trim() !== "" && longDescAr.toLowerCase() !== "nan" && longDescAr !== "NaN" && longDescAr !== "None");
        
        return hasDescription;
      });
    }
    
    // Apply row limit
    if (!allRows && rowLimit) {
      const limit = parseInt(rowLimit, 10);
      if (!isNaN(limit) && limit > 0) {
        sourceData = sourceData.slice(0, limit);
      }
    }
    
    if (sourceData.length === 0) {
      alert("No products match the selected filters.");
      return;
    }
    
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
      // Standard export with selected columns (always exclude Website)
      const dataToExport = sourceData.map((product) => {
        const filteredProduct: any = {};
        selectedColumns.forEach((col) => {
          if (col !== "Website") {
            let value = (product as any)[col];
            // Prepend tab to Barcode to force Excel to treat it as text
            if (col === "Barcode" && value) {
              value = `\t${value}`;
            }
            filteredProduct[col] = value;
          }
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        if (selectedRows && selectedRows.length > 0) {
          setExportScope("selected");
        } else {
          setExportScope("all");
        }
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export Products</DialogTitle>
          <DialogDescription>
            Configure export options, filters, and select columns for CSV export.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[600px] pr-4">
          <div className="grid gap-4 py-4">
            {/* Export Scope */}
            {selectedRows && selectedRows.length > 0 && (
              <div className="flex flex-col space-y-2 border-b pb-4">
                <Label className="text-sm font-semibold">Export Scope</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="all" 
                      name="scope" 
                      checked={exportScope === "all"} 
                      onChange={() => setExportScope("all")}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="all" className="cursor-pointer">All Products ({products.length})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="selected" 
                      name="scope" 
                      checked={exportScope === "selected"} 
                      onChange={() => setExportScope("selected")}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="selected" className="cursor-pointer">Selected Rows ({selectedRows.length})</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use checkboxes in the table to select specific products
                </p>
              </div>
            )}
            {(!selectedRows || selectedRows.length === 0) && (
              <div className="flex flex-col space-y-2 border-b pb-4">
                <Label className="text-sm font-semibold">Export Scope</Label>
                <p className="text-sm text-muted-foreground">
                  All Products ({products.length})
                </p>
                <p className="text-xs text-muted-foreground">
                  Use checkboxes in the table to select specific products for export
                </p>
              </div>
            )}
            
            {/* Export Format */}
            <div className="flex flex-col space-y-2 border-b pb-4">
              <Label className="text-sm font-semibold">Export Format</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="standard" 
                    name="format" 
                    checked={exportFormat === "standard"} 
                    onChange={() => setExportFormat("standard")}
                    className="cursor-pointer"
                  />
                  <Label htmlFor="standard" className="cursor-pointer">Standard (Custom Columns)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="magento" 
                    name="format" 
                    checked={exportFormat === "magento"} 
                    onChange={() => setExportFormat("magento")}
                    className="cursor-pointer"
                  />
                  <Label htmlFor="magento" className="cursor-pointer">Magento Compatible</Label>
                </div>
              </div>
              {exportFormat === "magento" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Exports in Magento catalog import format with all required fields
                </p>
              )}
            </div>

            {/* Filters Section */}
            <div className="flex flex-col space-y-3 border-b pb-4">
              <Label className="text-sm font-semibold">Filters</Label>
              
              {/* Image Filters */}
              <div className="flex flex-col space-y-2 bg-muted/50 p-3 rounded-md">
                <Label className="text-xs font-medium text-muted-foreground">Image Filters</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="images-all"
                      name="images-filter"
                      checked={!filterMissingImages && !filterWithImages}
                      onChange={() => {
                        setFilterMissingImages(false);
                        setFilterWithImages(false);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="images-all" className="text-sm cursor-pointer">
                      All products
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="images-with"
                      name="images-filter"
                      checked={filterWithImages}
                      onChange={() => {
                        setFilterWithImages(true);
                        setFilterMissingImages(false);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="images-with" className="text-sm cursor-pointer">
                      Only products with images
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="images-missing"
                      name="images-filter"
                      checked={filterMissingImages}
                      onChange={() => {
                        setFilterMissingImages(true);
                        setFilterWithImages(false);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="images-missing" className="text-sm cursor-pointer">
                      Only products with no images
                    </Label>
                  </div>
                </div>
              </div>
              
              {/* Description Filters */}
              <div className="flex flex-col space-y-2 bg-muted/50 p-3 rounded-md">
                <Label className="text-xs font-medium text-muted-foreground">Description Filters</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="descriptions-all"
                      name="descriptions-filter"
                      checked={!filterMissingDescriptions && !filterWithDescriptions}
                      onChange={() => {
                        setFilterMissingDescriptions(false);
                        setFilterWithDescriptions(false);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="descriptions-all" className="text-sm cursor-pointer">
                      All products
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="descriptions-with"
                      name="descriptions-filter"
                      checked={filterWithDescriptions}
                      onChange={() => {
                        setFilterWithDescriptions(true);
                        setFilterMissingDescriptions(false);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="descriptions-with" className="text-sm cursor-pointer">
                      Only products with descriptions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="descriptions-missing"
                      name="descriptions-filter"
                      checked={filterMissingDescriptions}
                      onChange={() => {
                        setFilterMissingDescriptions(true);
                        setFilterWithDescriptions(false);
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="descriptions-missing" className="text-sm cursor-pointer">
                      Only products with no descriptions
                    </Label>
                  </div>
                </div>
              </div>
              
              {/* Main Category Filter */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-main-categories"
                    checked={allMainCategories}
                    onCheckedChange={handleAllMainCategoriesChange}
                  />
                  <Label htmlFor="all-main-categories" className="text-sm font-medium">
                    All Main Categories
                  </Label>
                </div>
                {!allMainCategories && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {selectedMainCategories.length > 0
                          ? `${selectedMainCategories.length} selected`
                          : "Select categories"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <ScrollArea className="h-[200px]">
                        <div className="p-2 space-y-1">
                          {uniqueCategories.mainCategories.map((cat) => (
                            <div key={cat} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                              <Checkbox
                                id={`main-cat-${cat}`}
                                checked={selectedMainCategories.includes(cat)}
                                onCheckedChange={() => handleToggleMainCategory(cat)}
                              />
                              <Label
                                htmlFor={`main-cat-${cat}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {cat}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Sub-Category Filter */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-sub-categories"
                    checked={allSubCategories}
                    onCheckedChange={handleAllSubCategoriesChange}
                  />
                  <Label htmlFor="all-sub-categories" className="text-sm font-medium">
                    All Sub-Categories
                  </Label>
                </div>
                {!allSubCategories && availableSubCategories.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={allMainCategories && selectedMainCategories.length === 0}
                      >
                        {selectedSubCategories.length > 0
                          ? `${selectedSubCategories.length} selected`
                          : "Select sub-categories"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <ScrollArea className="h-[200px]">
                        <div className="p-2 space-y-1">
                          {availableSubCategories.map((subCat) => (
                            <div key={subCat} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                              <Checkbox
                                id={`sub-cat-${subCat}`}
                                checked={selectedSubCategories.includes(subCat)}
                                onCheckedChange={() => handleToggleSubCategory(subCat)}
                              />
                              <Label
                                htmlFor={`sub-cat-${subCat}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {subCat}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Row Limit */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-rows"
                    checked={allRows}
                    onCheckedChange={handleAllRowsChange}
                  />
                  <Label htmlFor="all-rows" className="text-sm font-medium">
                    All Rows
                  </Label>
                </div>
                {!allRows && (
                  <div className="flex flex-col space-y-1.5">
                    <Input
                      id="row-limit"
                      type="number"
                      placeholder="Enter row limit"
                      value={rowLimit}
                      onChange={(e) => setRowLimit(e.target.value)}
                      min="1"
                      className="w-full"
                      disabled={allRows}
                    />
                    <p className="text-xs text-muted-foreground">
                      Limit the number of rows to export
                    </p>
                  </div>
                )}
              </div>

            </div>
            
            {/* Preview Count */}
            <div className="bg-primary/10 p-3 rounded-md border border-primary/20">
              <p className="text-sm font-semibold">
                Will export: <span className="text-primary font-bold text-base">{filteredRowCount}</span> row{filteredRowCount !== 1 ? 's' : ''}
              </p>
              {filteredRowCount === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No products match the selected filters. Adjust your filters to export data.
                </p>
              )}
            </div>

            {/* Columns Selection (Standard Format Only) */}
            {exportFormat === "standard" && (
              <div className="flex flex-col space-y-2 border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Select Columns</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedColumns(ALL_COLUMNS)}
                      className="h-7 text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedColumns([])}
                      className="h-7 text-xs"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 p-3 rounded-md max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {ALL_COLUMNS.map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={column}
                          checked={selectedColumns.includes(column)}
                          onCheckedChange={() => handleToggleColumn(column)}
                        />
                        <Label htmlFor={column} className="text-sm cursor-pointer flex-1">
                          {column}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedColumns.length} of {ALL_COLUMNS.length} columns selected
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              {exportScope === "selected" && selectedRows?.length ? (
                <span>{selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected</span>
              ) : (
                <span>{products.length} total product{products.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <Button 
              onClick={handleExport}
              disabled={filteredRowCount === 0}
            >
              Export {filteredRowCount > 0 && `(${filteredRowCount})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

