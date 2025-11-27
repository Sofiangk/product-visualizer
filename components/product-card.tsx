"use client";

import { Product } from "@/lib/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductDialog } from "./product-dialog";
import { useState } from "react";
import { Pencil } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ProductDialog product={product} open={open} onOpenChange={setOpen} />
      <Card className="overflow-hidden flex flex-col h-full">
        <div className="aspect-square relative bg-muted flex items-center justify-center overflow-hidden">
          {product.Image ? (
            <img
              src={product.Image}
              alt={product.Product}
              className="object-contain max-h-full max-w-full hover:scale-105 transition-transform duration-300"
              onLoad={(e) => {
                const img = e.currentTarget;
                const isPortrait = img.naturalHeight > img.naturalWidth;
                if (isPortrait) {
                  img.className = "object-contain h-full w-auto hover:scale-105 transition-transform duration-300";
                } else {
                  img.className = "object-contain w-full h-auto hover:scale-105 transition-transform duration-300";
                }
              }}
            />
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
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-xs">
              {product["Main Category (EN)"]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {product["Sub-Category (EN)"]}
            </Badge>
          </div>
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
