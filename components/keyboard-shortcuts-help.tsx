"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ["Ctrl", "K"], description: "Focus search" },
    { keys: ["Ctrl", "Z"], description: "Undo last change" },
    { keys: ["Ctrl", "Y"], description: "Redo last change" },
    { keys: ["Esc"], description: "Clear search / Close dialogs" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8" title="Keyboard shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
