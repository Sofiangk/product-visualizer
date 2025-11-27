"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product } from "./schema";
import { getProducts } from "@/app/actions";

const STORAGE_KEY = "saidalia_products";

interface ProductsContextType {
  products: Product[];
  setProducts: (products: Product[]) => void;
  updateProduct: (updatedProduct: Product) => void;
  resetProducts: () => Promise<void>;
  loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProductsState] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      // Try localStorage first
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsedProducts = JSON.parse(stored);
          setProductsState(parsedProducts);
          setLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse stored products:", e);
        }
      }

      // Load from CSV if no stored data
      const { data } = await getProducts();
      if (data) {
        setProductsState(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  // Save to localStorage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products]);

  const setProducts = (newProducts: Product[]) => {
    setProductsState(newProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProducts));
  };

  const updateProduct = (updatedProduct: Product) => {
    setProductsState((prev) => {
      const index = prev.findIndex((p) => p.ID === updatedProduct.ID);
      if (index === -1) return prev;
      
      const newProducts = [...prev];
      newProducts[index] = updatedProduct;
      return newProducts;
    });
  };

  const resetProducts = async () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    // Reload from CSV
    setLoading(true);
    const { data } = await getProducts();
    if (data) {
      setProductsState(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    setLoading(false);
  };

  return (
    <ProductsContext.Provider value={{ products, setProducts, updateProduct, resetProducts, loading }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within ProductsProvider");
  }
  return context;
}

