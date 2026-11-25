"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/hooks/use-products";

export type ProductSpecies = "DOG" | "CAT" | "BOTH";

export interface ProductFormDialogState {
  open: boolean;
  product: Product | null;
  name: string;
  price: number | undefined;
  originalPrice: string;
  stock: number | undefined;
  category: string;
  species: ProductSpecies;
  description: string;
  imageUrl: string;
  imagePreviewUrl: string;
  isUploadingImage: boolean;
  isSaving: boolean;
}

export interface ProductFormDialogActions {
  onOpenChange: (open: boolean) => void;
  setName: (value: string) => void;
  setPrice: (value: number | undefined) => void;
  setOriginalPrice: (value: string) => void;
  setStock: (value: number | undefined) => void;
  setCategory: (value: string) => void;
  setSpecies: (value: ProductSpecies) => void;
  setDescription: (value: string) => void;
  onSelectImage: (file: File | null) => void | Promise<void>;
  onRemoveImage: () => void;
  onSubmit: (event: React.FormEvent) => void | Promise<void>;
}

interface ProductFormDialogProps {
  state: ProductFormDialogState;
  actions: ProductFormDialogActions;
}

export function ProductFormDialog({ state, actions }: ProductFormDialogProps) {
  const {
    open: isModalOpen,
    product: editingProduct,
    name,
    price,
    originalPrice,
    stock,
    category,
    species,
    description,
    imageUrl,
    imagePreviewUrl,
    isUploadingImage,
    isSaving,
  } = state;
  const { onOpenChange: setIsModalOpen, setName, setPrice, setOriginalPrice, setStock, setCategory, setSpecies, setDescription, onSelectImage, onRemoveImage, onSubmit: handleSubmit } = actions;

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent showCloseButton={false} className="w-full max-w-[calc(100%-2rem)] space-y-4 overflow-y-auto border-border-subtle bg-surface p-6 max-h-[90dvh] sm:max-w-lg">
            <DialogHeader className="flex-row items-center justify-between border-b border-border-subtle pb-3">
              <DialogTitle className="text-lg font-semibold text-ink">
                {editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingProduct ? "Cập nhật thông tin sản phẩm." : "Nhập thông tin sản phẩm, giá bán và tồn kho ban đầu."}
              </DialogDescription>
              <Button
                type="button"
                onClick={() => setIsModalOpen(false)}
                variant="ghost"
                size="icon-lg"
                aria-label="Đóng biểu mẫu"
                className="rounded-lg text-muted-text"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
              <div>
                <label htmlFor="product-name" className="mb-1 block font-bold text-ink">
                  Tên sản phẩm <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="product-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Hạt Royal Canin Mini Puppy 2kg"
                  className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface text-sm focus:bg-surface"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="product-price" className="mb-1 block font-bold text-ink">
                    Giá bán thực tế (VNĐ) <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="product-price"
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={price ?? ""}
                    onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="Nhập giá bán thực tế"
                    aria-describedby="product-price-help"
                    className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface text-sm focus:bg-surface"
                  />
                  <p id="product-price-help" className="mt-1 text-xs text-muted-text">Giá phải lớn hơn 0đ. Hàng tặng được ghi nhận bằng điều chỉnh tồn.</p>
                </div>
                <div>
                  <label htmlFor="product-original-price" className="mb-1 block font-bold text-ink">Giá niêm yết</label>
                  <Input
                    id="product-original-price"
                    type="number"
                    min={0}
                    step={1}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="Để trống nếu không áp dụng"
                    aria-describedby="product-original-price-help"
                    className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface text-sm focus:bg-surface"
                  />
                  <p id="product-original-price-help" className="mt-1 text-xs text-muted-text">Chỉ hiển thị giá gạch ngang khi cao hơn giá bán.</p>
                </div>
                {editingProduct ? (
                  <div className="rounded-xl border border-border-subtle bg-admin-muted-surface p-3 text-sm">
                    <p className="font-semibold text-ink">Tồn thực tế: {editingProduct.stock}</p>
                    <p className="mt-1 text-xs text-muted-text">
                      Đang giữ cho QR: {editingProduct.reservedStock ?? 0} · Khả dụng: {Math.max(0, editingProduct.stock - (editingProduct.reservedStock ?? 0))}
                    </p>
                    <p className="mt-2 text-xs text-muted-text">
                      Muốn cập nhật tồn, dùng thao tác “Điều chỉnh tồn” trong danh sách để lưu lý do và lịch sử.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="product-stock" className="mb-1 block font-bold text-ink">
                      Tồn đầu kỳ thực tế <span aria-hidden="true">*</span>
                    </label>
                    <Input
                      id="product-stock"
                      type="number"
                      required
                      min={0}
                      step={1}
                      value={stock ?? ""}
                      onChange={(e) => setStock(e.target.value === "" ? undefined : Number(e.target.value))}
                      className="h-10 rounded-lg border-border-subtle bg-admin-muted-surface text-sm focus:bg-surface"
                    />
                    <p className="mt-1 text-xs text-muted-text">Số lượng này sẽ được ghi nhận là giao dịch tồn đầu kỳ.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="product-category" className="mb-1 block font-bold text-ink">
                    Danh mục <span aria-hidden="true">*</span>
                  </label>
                  <Select
                    items={{ FOOD: "Thức ăn", SNACK: "Đồ ăn vặt", CARE: "Chăm sóc", ACCESSORY: "Phụ kiện" }}
                    value={category || null}
                    onValueChange={(value) => {
                      if (value) setCategory(value)
                    }}
                  >
                    <SelectTrigger
                      id="product-category"
                      aria-required="true"
                      aria-describedby="product-category-help"
                      className="w-full h-10 rounded-xl border-border-subtle bg-admin-muted-surface text-sm"
                    >
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOOD">Thức ăn</SelectItem>
                      <SelectItem value="SNACK">Đồ ăn vặt</SelectItem>
                      <SelectItem value="CARE">Chăm sóc</SelectItem>
                      <SelectItem value="ACCESSORY">Phụ kiện</SelectItem>
                    </SelectContent>
                  </Select>
                  <p id="product-category-help" className="mt-1 text-xs text-muted-text">
                    Bắt buộc chọn để phân loại chính xác.
                  </p>
                </div>
                <div>
                  <label htmlFor="product-species" className="mb-1 block font-bold text-ink">Dành cho loài</label>
                  <Select
                    items={{ DOG: "Chó", CAT: "Mèo", BOTH: "Chó và mèo" }}
                    value={species}
                    onValueChange={(value) => {
                      if (value) setSpecies(value as "DOG" | "CAT" | "BOTH")
                    }}
                  >
                    <SelectTrigger id="product-species" className="w-full h-10 rounded-xl border-border-subtle bg-admin-muted-surface text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOG">Chó</SelectItem>
                      <SelectItem value="CAT">Mèo</SelectItem>
                      <SelectItem value="BOTH">Chó và mèo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label htmlFor="product-description" className="mb-1 block font-bold text-ink">
                  Mô tả sản phẩm <span aria-hidden="true">*</span>
                </label>
                <Textarea
                  id="product-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn về sản phẩm, cách dùng hoặc lưu ý cho khách."
                  className="border-border-subtle bg-admin-muted-surface text-sm focus:bg-surface"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="product-image" className="block font-bold text-ink">Ảnh sản phẩm</label>
                <Input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingImage}
                  onChange={(event) => {
                    void onSelectImage(event.currentTarget.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                  aria-describedby="product-image-help"
                  className="h-auto min-h-10 cursor-pointer rounded-lg border-border-subtle bg-admin-muted-surface p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:font-semibold file:text-ink"
                />
                <p id="product-image-help" className="text-xs text-muted-text">Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được tải lên ngay khi chọn.</p>
                {isUploadingImage && <p role="status" className="text-xs font-medium text-primary">Đang tải ảnh lên…</p>}
                {(imagePreviewUrl || imageUrl) && (
                  <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-admin-muted-surface p-2">
                    <img src={imagePreviewUrl || imageUrl} alt="Ảnh sản phẩm xem trước" className="size-16 shrink-0 rounded-lg bg-surface object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-xs text-muted-text">{isUploadingImage ? "Đang tải ảnh lên; đây là ảnh xem trước." : "Ảnh đã sẵn sàng lưu cùng sản phẩm."}</p>
                      <Button type="button" variant="ghost" onClick={onRemoveImage} disabled={isUploadingImage} className="mt-1 h-8 px-2 text-xs text-rose-700">Gỡ ảnh</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="h-10 rounded-lg border-border-subtle px-4 text-sm text-muted-text"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 rounded-lg bg-admin-primary px-4 text-sm font-semibold text-white hover:bg-admin-primary-hover"
                >
                  {isSaving ? <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Đang lưu…</> : "Lưu sản phẩm"}
                </Button>
              </div>
            </form>
          </DialogContent>
      </Dialog>
    </>
  );
}
