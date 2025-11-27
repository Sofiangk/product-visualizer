"use client";

import { Product } from "@/lib/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductDialog } from "./product-dialog";
import { useState, useEffect } from "react";
import { Pencil, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all images: main image + additional images
  const allImages: string[] = [];
  if (product.Image) {
    allImages.push(product.Image);
  }
  if (product["Additional Images"]) {
    const additional = product["Additional Images"].split('|').filter(Boolean);
    allImages.push(...additional);
  }

  const hasMultipleImages = allImages.length > 1;

  // Auto-advance carousel every 3 seconds if multiple images
  useEffect(() => {
    if (!hasMultipleImages) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasMultipleImages, allImages.length]);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <>
      <ProductDialog product={product} open={open} onOpenChange={setOpen} />
      <Card className="overflow-hidden flex flex-col h-full">
        <div className="aspect-square relative bg-muted flex items-center justify-center overflow-hidden group">
          {allImages.length > 0 ? (
            <>
              <img
                key={allImages[currentImageIndex]}
                src={allImages[currentImageIndex]}
                alt={`${product.Product} - Image ${currentImageIndex + 1}`}
                className="object-contain max-h-full max-w-full transition-opacity duration-300"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const isPortrait = img.naturalHeight > img.naturalWidth;
                  if (isPortrait) {
                    img.className = "object-contain h-full w-auto transition-opacity duration-300";
                  } else {
                    img.className = "object-contain w-full h-auto transition-opacity duration-300";
                  }
                }}
              />
              
              {/* Carousel Navigation */}
              {hasMultipleImages && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Next Button */}
                  <button
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  {/* Image Indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {allImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToImage(index);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'bg-white w-6'
                            : 'bg-white/50 w-1.5 hover:bg-white/75'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Image Counter */}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-sm p-2">No Image</span>
          )}
        </div>
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold leading-none tracking-tight line-clamp-2" title={product.Product}>
              {product.Product}
            </h3>
            <Badge variant="secondary" className="shrink-0">
              {product.Price}
            </Badge>
          </div>
          {/* Breadcrumb: cat > sub-cat */}
          {(product["Main Category (EN)"] || product["Sub-Category (EN)"]) && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              {product["Main Category (EN)"] && (
                <>
                  <span className="truncate">{product["Main Category (EN)"]}</span>
                  {product["Sub-Category (EN)"] && (
                    <>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{product["Sub-Category (EN)"]}</span>
                    </>
                  )}
                </>
              )}
              {!product["Main Category (EN)"] && product["Sub-Category (EN)"] && (
                <span className="truncate">{product["Sub-Category (EN)"]}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {product["Short Description En"] || product["Long Description En"] || "No description"}
          </p>
        </CardContent>
        <CardFooter className=" pt-0">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
