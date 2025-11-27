"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImagePreviewProps {
  src: string;
  alt: string;
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <div 
        className="h-16 w-16 relative group cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain rounded-md border bg-white hover:ring-2 hover:ring-primary transition-all"
        />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <img
              src={src}
              alt={alt}
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
