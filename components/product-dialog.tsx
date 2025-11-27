"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Product, productSchema } from "@/lib/schema";
import { CATEGORY_MAPPING, MAIN_CATEGORIES } from "@/lib/categories";
import { updateProduct } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Need to add textarea
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface ProductDialogProps {
  product: Product;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProductDialog({ product, trigger, open, onOpenChange }: ProductDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const form = useForm<Product>({
    resolver: zodResolver(productSchema),
    defaultValues: product,
  });

  // Update form values when product prop changes
  useEffect(() => {
    form.reset(product);
  }, [product, form]);

  const mainCategory = form.watch("Main Category (EN)");

  async function onSubmit(data: Product) {
    setIsPending(true);
    try {
      const result = await updateProduct(data);
      if (result.success) {
        setIsOpen(false);
      } else {
        console.error(result.error);
        // Ideally show a toast here
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Make changes to the product here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="Product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="Main Category (EN)"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Category</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("Sub-Category (EN)", ""); // Reset sub-category
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MAIN_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Sub-Category (EN)"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!mainCategory}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sub-category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(CATEGORY_MAPPING[mainCategory] || []).map((subCategory) => (
                            <SelectItem key={subCategory} value={subCategory}>
                              {subCategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="Short Description En"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description (EN)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="Short Description Ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description (AR)</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-right" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="Long Description En"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long Description (EN)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="Long Description Ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long Description (AR)</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-right" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="Image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("Image") && (
                <div className="mt-2">
                  <img
                    src={form.watch("Image")}
                    alt="Preview"
                    className="h-32 w-32 object-contain border rounded"
                  />
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
