"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";
import { Product } from "@/lib/schema";
import { getProducts } from "./actions";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const { data } = await getProducts();
      if (data) {
        setProducts(data);
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  const handleImport = (importedProducts: Product[]) => {
    setProducts(importedProducts);
  };

  if (loading) {
    return (
      <main className="container mx-auto py-10 h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading products...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-10 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Product Management</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <DataTable columns={columns} data={products} onDataChange={handleImport} />
      </div>
    </main>
  );
}
