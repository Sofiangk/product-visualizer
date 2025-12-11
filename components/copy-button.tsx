"use client";

import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={className}
      title={label || "Copy to clipboard"}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          {label && <span className="hidden sm:inline">Copied!</span>}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-1" />
          {label && <span className="hidden sm:inline">{label}</span>}
        </>
      )}
    </Button>
  );
}
