"use client";

import * as React from "react";
import type {
  ProductFormDialogActions,
  ProductFormDialogState,
} from "@/components/admin/products/product-form-dialog";
import {
  useCreateProduct,
  type Product,
  type useUpdateProduct,
} from "@/hooks/use-products";
import { toast } from "sonner";
import { getProductFormError } from "@/lib/product-form-validation";
import { apiClient } from "@/lib/api-client";
import { getProductImageUploadError } from "@/lib/product-image-upload";
import { useImageUploadPreview } from "@/hooks/use-image-upload-preview";

type UpdateProductMutation = ReturnType<typeof useUpdateProduct>;

interface UseProductFormWorkflowOptions {
  updateProduct: UpdateProductMutation;
}

export function useProductFormWorkflow({
  updateProduct,
}: UseProductFormWorkflowOptions) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState<number | undefined>(undefined);
  const [originalPrice, setOriginalPrice] = React.useState("");
  const [stock, setStock] = React.useState<number | undefined>(undefined);
  const [category, setCategory] = React.useState("");
  const [species, setSpecies] = React.useState<ProductFormDialogState["species"]>("BOTH");
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const imagePreview = useImageUploadPreview();
  const createProduct = useCreateProduct();

  const openCreate = () => {
    imagePreview.clearPreview();
    setEditingProduct(null);
    setName("");
    setPrice(undefined);
    setOriginalPrice("");
    setStock(undefined);
    setCategory("");
    setSpecies("BOTH");
    setDescription("");
    setImageUrl("");
    setIsOpen(true);
  };

  const openEdit = (product: Product) => {
    imagePreview.clearPreview();
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price);
    setOriginalPrice(product.originalPrice === null ? "" : String(product.originalPrice));
    setStock(undefined);
    setCategory(product.category);
    setSpecies(product.suitableSpecies ?? "BOTH");
    setDescription(product.description || "");
    setImageUrl(product.imageUrl || "");
    setIsOpen(true);
  };

  const onSelectImage = async (file: File | null) => {
    if (!file) return;
    const validationError = getProductImageUploadError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    imagePreview.previewFile(file);
    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingImage(true);
    try {
      const uploadedImage = await apiClient.post<{ url: string; publicId: string }>("/upload/image", formData);
      setImageUrl(uploadedImage.url);
      imagePreview.clearPreview();
      toast.success("Đã tải ảnh lên. Ảnh sẽ được lưu cùng sản phẩm khi bạn bấm Lưu.");
    } catch (error) {
      imagePreview.clearPreview();
      toast.error(error instanceof Error ? error.message : "Không tải được ảnh. Vui lòng thử lại.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = getProductFormError({ name, price, stock, category, originalPrice, description }, !!editingProduct);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const parsedOriginalPrice = originalPrice.trim() === "" ? null : Number(originalPrice);

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          data: {
            name: name.trim(),
            price,
            originalPrice: parsedOriginalPrice,
            category,
            suitableSpecies: species === "BOTH" ? null : species,
            description: description.trim(),
            imageUrl,
          },
        });
        toast.success("Đã cập nhật sản phẩm thành công.");
      } else {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
        await createProduct.mutateAsync({
          name: name.trim(),
          slug,
          price,
          originalPrice: parsedOriginalPrice,
          stock: stock!,
          category,
          suitableSpecies: species === "BOTH" ? null : species,
          description: description.trim(),
          imageUrl,
          isBestSeller: false,
          isNew: true,
        });
        toast.success("Đã thêm sản phẩm mới vào kho.");
      }
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu sản phẩm. Vui lòng thử lại.");
    }
  };

  const state: ProductFormDialogState = {
    open: isOpen,
    product: editingProduct,
    name,
    price,
    originalPrice,
    stock,
    category,
    species,
    description,
    imageUrl,
    imagePreviewUrl: imagePreview.previewUrl ?? "",
    isUploadingImage,
    isSaving: createProduct.isPending || updateProduct.isPending || isUploadingImage,
  };

  const actions: ProductFormDialogActions = {
    onOpenChange: setIsOpen,
    setName,
    setPrice,
    setOriginalPrice,
    setStock,
    setCategory,
    setSpecies,
    setDescription,
    onSelectImage,
    onRemoveImage: () => {
      imagePreview.clearPreview();
      setImageUrl("");
    },
    onSubmit: handleSubmit,
  };

  return { state, actions, openCreate, openEdit };
}
