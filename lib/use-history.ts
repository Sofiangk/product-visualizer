"use client";

import { create } from 'zustand';
import { Product } from './schema';

interface HistoryState {
  past: Product[][];
  present: Product[];
  future: Product[][];
}

interface HistoryStore extends HistoryState {
  set: (products: Product[]) => void;
  undo: () => Product[] | null;
  redo: () => Product[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistory = create<HistoryStore>((set, get) => ({
  past: [],
  present: [],
  future: [],
  
  set: (products: Product[]) => {
    const { present, past } = get();
    
    // Don't add to history if products haven't changed
    if (JSON.stringify(present) === JSON.stringify(products)) {
      return;
    }
    
    set({
      past: [...past, present],
      present: products,
      future: [], // Clear future when new change is made
    });
  },
  
  undo: () => {
    const { past, present, future } = get();
    
    if (past.length === 0) return null;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    set({
      past: newPast,
      present: previous,
      future: [present, ...future],
    });
    
    return previous;
  },
  
  redo: () => {
    const { past, present, future } = get();
    
    if (future.length === 0) return null;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    set({
      past: [...past, present],
      present: next,
      future: newFuture,
    });
    
    return next;
  },
  
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  
  clear: () => set({ past: [], present: [], future: [] }),
}));
