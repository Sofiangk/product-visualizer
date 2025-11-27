"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product } from "./schema";
import { getProducts } from "@/app/actions";

const STORAGE_KEY = "saidalia_products";

// Normalize product to ensure Price and Quantity defaults
function normalizeProduct(product: Product): Product {
  const normalized = { ...product };
  
  // Set Price to "1" if missing or "0"
  if (!normalized.Price || normalized.Price === '0' || normalized.Price.trim() === '' || 
      normalized.Price.toLowerCase() === 'nan' || normalized.Price === 'NaN' || normalized.Price === 'None') {
    normalized.Price = '1';
  }
  
  // Set Quantity to "1" if missing or "0"
  if (!normalized.Quantity || normalized.Quantity === '0' || normalized.Quantity.trim() === '' || 
      normalized.Quantity.toLowerCase() === 'nan' || normalized.Quantity === 'NaN' || normalized.Quantity === 'None') {
    normalized.Quantity = '1';
  }
  
  return normalized;
}

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
          const parsedProducts = JSON.parse(stored) as Product[];
          // Normalize products to ensure defaults
          const normalizedProducts = parsedProducts.map(normalizeProduct);
          setProductsState(normalizedProducts);
          setLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse stored products:", e);
        }
      }

      // Load from CSV if no stored data
      const { data } = await getProducts();
      if (data) {
        // Normalize products to ensure defaults
        const normalizedProducts = data.map(normalizeProduct);
        setProductsState(normalizedProducts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedProducts));
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
      // Normalize the updated product to ensure defaults
      newProducts[index] = normalizeProduct(updatedProduct);
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
      // Normalize products to ensure defaults
      const normalizedProducts = data.map(normalizeProduct);
      setProductsState(normalizedProducts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedProducts));
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

