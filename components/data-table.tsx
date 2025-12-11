"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LayoutGrid, List, Settings2, Undo2, Redo2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProductCard } from "./product-card";
import { Product } from "@/lib/schema";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import { useHistory } from "@/lib/use-history";

import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onDataChange?: (data: TData[]) => void;
  onReset?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onDataChange,
  onReset,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
        ID: false, // Hide ID by default
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const [view, setView] = React.useState<"table" | "grid">("table");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const prevViewRef = React.useRef<"table" | "grid">(view);
  
  // Undo/Redo history
  const history = useHistory();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    initialState: {
        pagination: {
            pageSize: 10,
        }
    },
    // Prevent automatic page reset when data changes
    autoResetPageIndex: false,
  });

  // Update page size when view changes (preserve page index if possible)
  React.useEffect(() => {
    if (prevViewRef.current === view) return; // View hasn't changed
    prevViewRef.current = view;
    
    const newPageSize = view === "grid" ? 20 : 10;
    setPagination((prev) => {
      if (prev.pageSize === newPageSize) return prev; // Already correct size
      
      // Use data length as proxy for filtered rows (table instance is unstable)
      const totalRows = data.length;
      const newTotalPages = Math.ceil(totalRows / newPageSize);
      
      // Adjust page index if current page would be out of bounds
      const adjustedPageIndex = Math.min(prev.pageIndex, Math.max(0, newTotalPages - 1));
      
      return {
        pageIndex: adjustedPageIndex,
        pageSize: newPageSize,
      };
    });
  }, [view, data.length]);

  // Scroll to top when page changes
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
  }, [table.getState().pagination.pageIndex]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [columnFilters, table.getState().globalFilter]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      callback: (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
      description: 'Focus search',
    },
    {
      key: 'z',
      ctrl: true,
      callback: (e) => {
        e.preventDefault();
        if (history.canUndo() && onDataChange) {
          const previous = history.undo();
          if (previous) {
            onDataChange(previous as TData[]);
          }
        }
      },
      description: 'Undo',
    },
    {
      key: 'y',
      ctrl: true,
      callback: (e) => {
        e.preventDefault();
        if (history.canRedo() && onDataChange) {
          const next = history.redo();
          if (next) {
            onDataChange(next as TData[]);
          }
        }
      },
      description: 'Redo',
    },
    {
      key: 'Escape',
      callback: () => {
        table.getColumn("Product")?.setFilterValue("");
        searchInputRef.current?.blur();
      },
      description: 'Clear search',
    },
  ]);

  // Update history when data changes
  React.useEffect(() => {
    if (data.length > 0) {
      history.set(data as Product[]);
    }
  }, [data]);

// ... inside DataTable component

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 order-2 sm:order-1">
          <DataTableToolbar 
            table={table} 
            onImport={onDataChange ? (products) => onDataChange(products as TData[]) : undefined}
            onReset={() => {
              if (onReset) {
                onReset();
                history.clear(); // Clear undo/redo history when resetting
              }
            }}
            searchInputRef={searchInputRef}
            canUndo={history.canUndo()}
            canRedo={history.canRedo()}
            onUndo={() => {
              if (history.canUndo() && onDataChange) {
                const previous = history.undo();
                if (previous) onDataChange(previous as TData[]);
              }
            }}
            onRedo={() => {
              if (history.canRedo() && onDataChange) {
                const next = history.redo();
                if (next) onDataChange(next as TData[]);
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2 justify-end">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "table" | "grid")} className="border rounded-md">
            <ToggleGroupItem value="table" aria-label="Table view" className="data-[state=on]:bg-muted">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="data-[state=on]:bg-muted">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Settings2 className="mr-2 h-4 w-4 hidden sm:inline" />
                <span className="hidden sm:inline">Columns</span>
                <Settings2 className="h-4 w-4 sm:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="rounded-md border flex-1 flex flex-col bg-background min-h-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
            {view === "table" ? (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 border-b">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="h-16"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-1">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 p-4">
                    {table.getRowModel().rows.map((row) => (
                        <ProductCard key={row.id} product={row.original as Product} />
                    ))}
                </div>
            )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 border-t gap-4">
        <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
          <span className="hidden sm:inline">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length} products
          </span>
          <span className="sm:hidden">
            {table.getFilteredRowModel().rows.length} products
          </span>
          {Object.keys(rowSelection).length > 0 && ` (${Object.keys(rowSelection).length} selected)`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">First page</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Previous page</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Next page</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Last page</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
