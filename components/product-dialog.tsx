"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Product, productSchema } from "@/lib/schema";
import { CATEGORY_MAPPING, MAIN_CATEGORIES } from "@/lib/categories";
import { useProducts } from "@/lib/products-context";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Image as ImageIcon, Package, FileText } from "lucide-react";

interface ProductDialogProps {
  product: Product;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProductDialog({ product, trigger, open, onOpenChange }: ProductDialogProps) {
  const { updateProduct } = useProducts();
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

  function onSubmit(data: Product) {
    setIsPending(true);
    try {
      const validation = productSchema.safeParse(data);
      if (validation.success) {
        updateProduct(data);
        setIsOpen(false);
      } else {
        console.error(validation.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  const imageUrl = form.watch("Image");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[1400px] max-h-[90vh] w-[98vw] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">Edit Product</DialogTitle>
          <DialogDescription>
            Update product information, descriptions, and images.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ScrollArea className="flex-1 px-6 max-h-[calc(90vh-200px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6 pr-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="gap-2">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Basic Info</span>
                    <span className="sm:hidden">Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="descriptions" className="gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Descriptions</span>
                    <span className="sm:hidden">Desc</span>
                  </TabsTrigger>
                  <TabsTrigger value="media" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Image</span>
                    <span className="sm:hidden">Image</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6 mt-6">
                  {/* Product Name & Price */}
                  <FormField
                    control={form.control}
                    name="Product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter product name" className="text-lg" />
                        </FormControl>
                        <FormDescription>The display name of your product</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="Price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="99.99" type="text" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="Barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123456789" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="Quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="100" type="text" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="Expiry Date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="MM/DD/YYYY" />
                        </FormControl>
                        <FormDescription>Optional expiration date for the product</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Categories */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Categories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="Main Category (EN)"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Main Category *</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                const firstSubCat = CATEGORY_MAPPING[value]?.[0];
                                if (firstSubCat) {
                                  form.setValue("Sub-Category (EN)", firstSubCat);
                                }
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select main category" />
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
                            <FormLabel>Sub-Category *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!mainCategory}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sub-category" />
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
                            <FormDescription>
                              {!mainCategory && "Select main category first"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="descriptions" className="space-y-6 mt-6">
                  {/* English Descriptions */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">English Descriptions</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="Short Description En"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Short Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Brief product description (1-2 sentences)"
                                className="resize-y min-h-[80px]"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription>
                              {field.value?.length || 0} characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="Long Description En"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Long Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Detailed product description, features, benefits, usage instructions..."
                                className="resize-y min-h-[150px]"
                                rows={8}
                              />
                            </FormControl>
                            <FormDescription>
                              {field.value?.length || 0} characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Arabic Descriptions */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Arabic Descriptions (وصف عربي)</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="Short Description Ar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>وصف قصير (Short Description)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="وصف مختصر للمنتج"
                                className="resize-y min-h-[80px] text-right"
                                dir="rtl"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription className="text-right" dir="rtl">
                              {field.value?.length || 0} حرف
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="Long Description Ar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>وصف مفصل (Long Description)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="وصف تفصيلي للمنتج، المميزات، الفوائد، طريقة الاستخدام..."
                                className="resize-y min-h-[150px] text-right"
                                dir="rtl"
                                rows={8}
                              />
                            </FormControl>
                            <FormDescription className="text-right" dir="rtl">
                              {field.value?.length || 0} حرف
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-6 mt-6">
                  <FormField
                    control={form.control}
                    name="Image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="https://example.com/image.jpg" 
                            type="url"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter a direct URL to the product image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Image Preview */}
                  {imageUrl && (
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-sm font-medium text-muted-foreground">Preview</div>
                        <div className="relative w-full max-w-md aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                          <img
                            src={imageUrl}
                            alt="Product preview"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <ImageIcon className="mx-auto h-12 w-12 mb-2" />
                              <p className="text-sm">Failed to load image</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center max-w-md truncate">
                          {imageUrl}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!imageUrl && (
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-12 w-12" />
                        <p className="text-sm">No image URL provided</p>
                        <p className="text-xs">Enter an image URL above to see preview</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </ScrollArea>
        <Separator />
        <DialogFooter className="px-6 py-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isPending}
            className="min-w-[120px]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
