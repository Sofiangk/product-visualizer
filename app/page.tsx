"use client";

import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";
import { useProducts } from "@/lib/products-context";

export default function Home() {
  const { products, setProducts, resetProducts, loading } = useProducts();

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
    <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-10 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Product Management</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <DataTable columns={columns} data={products} onDataChange={setProducts} onReset={resetProducts} />
      </div>
    </main>
  );
}
