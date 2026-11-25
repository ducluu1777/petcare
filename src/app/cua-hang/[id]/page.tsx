"use client";

import { use, useState } from "react";
import Link from "next/link";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useProduct } from "@/hooks/use-products";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Product as CartProduct } from "@/types";
import { getProductCategoryLabel } from "@/lib/product-category";
import { getAvailableProductStock } from "@/lib/product-stock";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const resolvedParams = use(params);
  const { data: product, isLoading } = useProduct(resolvedParams.id);

  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [cartNotice, setCartNotice] = useState("");

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const existingQuantity = product ? cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0 : 0;
  const availableStock = product ? getAvailableProductStock(product) : 0;
  const remainingToAdd = Math.max(0, availableStock - existingQuantity);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push(`/dang-nhap?redirect=/cua-hang/${resolvedParams.id}`);
      return;
    }
    // Mapping API product to Cart item format
    const cartProduct: CartProduct = {
      id: product!.id,
      name: product!.name,
      slug: product!.slug,
      description: product!.description || "",
      price: product!.price,
      originalPrice: product!.originalPrice ?? undefined,
      category: product!.category.toLowerCase() as CartProduct["category"],
      categoryLabel: getProductCategoryLabel(product!.category),
      imageUrl: product!.imageUrl || "/product-placeholder.svg",
      isBestSeller: product!.isBestSeller,
      isNew: product!.isNew,
      stock: product!.stock,
      reservedStock: product!.reservedStock,
      rating: product!.rating,
      reviewCount: product!.reviewCount,
      specifications: product!.specifications ?? [],
    };

    const added = addItem(cartProduct, quantity);
    if (!added) {
      setCartNotice(`Hiện chỉ còn ${remainingToAdd} sản phẩm có thể thêm vào giỏ.`);
      return;
    }
    setCartNotice("");
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <CustomerSiteFrame>
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-14">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/cua-hang"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#65716A] hover:text-[#244B3F]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại cửa hàng</span>
            </Link>
          </div>

          {isLoading ? (
              <div className="flex min-h-80 items-center justify-center border-y border-[#DEDAD0] py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#244B3F]" />
            </div>
          ) : !product ? (
            <div className="border-y border-[#DEDAD0] py-20 text-center text-[#65716A]">
              Không tìm thấy sản phẩm.
            </div>
          ) : (
            <div className="customer-product-detail grid min-w-0 grid-cols-1 gap-8 py-6 sm:py-10 md:grid-cols-2 md:gap-12 lg:gap-16">
            {/* Left Image */}
            <div className="customer-product-detail__image relative aspect-[0.92/1] max-h-[620px] overflow-hidden rounded-3xl bg-[#F0EEE6] sm:aspect-[1.05/1]">
              <img
                src={product.imageUrl || "/product-placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(event) => {
                  if (!event.currentTarget.src.endsWith("/product-placeholder.svg")) {
                    event.currentTarget.src = "/product-placeholder.svg";
                  }
                }}
              />
              {product.isBestSeller && (
                <span className="absolute left-4 top-4 bg-[#E5ECE3] px-3 py-1.5 text-[11px] font-semibold text-[#1B3C33]">
                  Sản phẩm nổi bật
                </span>
              )}
            </div>

            {/* Right Information */}
            <div className="customer-product-detail__info min-w-0 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-[#244B3F]">
                  {getProductCategoryLabel(product.category)}
                </span>
                <h1 className="break-words font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#1B3C33] sm:text-4xl lg:text-5xl">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#65716A]">
                  <Star className="size-4 shrink-0 fill-current text-[#8A9A7A]" aria-hidden="true" />
                  <span className="font-semibold text-[#1B3C33]">{product.rating}</span>
                  <span className="min-w-0 break-words">({product.reviewCount} đánh giá từ khách hàng)</span>
                </div>

                {/* Price */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-2">
                  <span className="max-w-full break-words text-3xl font-semibold tabular-nums text-[#244B3F]">
                    {formatVND(product.price)}
                  </span>
                  {product.originalPrice !== null && product.originalPrice > product.price && (
                    <span className="max-w-full break-words text-sm text-[#65716A] line-through">
                      {formatVND(product.originalPrice)}
                    </span>
                  )}
                </div>

                <p className="break-words text-xs sm:text-sm text-[#65716A] leading-relaxed pt-2">
                  {product.description}
                </p>

                {/* Specifications table */}
                  <div className="space-y-2 border-t border-[#DEDAD0] pt-4">
                  <div className="text-xs font-bold text-[#253B33] tracking-wider mb-2">
                    Thông số chi tiết:
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {product.specifications?.map((spec, i) => (
                      <div key={i} className="flex min-w-0 justify-between gap-3 py-1 border-b border-[#F8F5EF]">
                        <span className="min-w-0 break-words text-[#65716A]">{spec.label}:</span>
                        <span className="min-w-0 break-words text-right font-medium text-[#253B33]">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add to Cart Actions */}
                  <div className="space-y-4 border-t border-[#DEDAD0] pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {/* Quantity selector */}
                  <div className="flex w-fit items-center rounded-full border border-[#D4D0C6] bg-[#FFFDF8] p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="size-9 rounded-full bg-white flex items-center justify-center font-semibold text-sm text-[#1B3C33] hover:bg-[#F0EEE6]"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={quantity >= remainingToAdd}
                      className="size-9 rounded-full bg-white flex items-center justify-center font-semibold text-sm text-[#1B3C33] hover:bg-[#F0EEE6]"
                    >
                      +
                    </button>
                  </div>

                  {/* Add button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={remainingToAdd <= 0 || quantity > remainingToAdd}
                    data-floating-contact-safe-zone
                    className={`btn-tactile min-h-12 min-w-0 flex-1 break-words rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                      isAdded
                        ? "bg-[#637650] text-white"
                        : "bg-[#244B3F] text-white hover:bg-[#1B3C33]"
                    } disabled:cursor-not-allowed disabled:bg-[#DEDAD0] disabled:text-[#65716A]`}
                  >
                    {remainingToAdd <= 0
                      ? "Hết hàng"
                      : quantity > remainingToAdd
                        ? `Chỉ còn thêm được ${remainingToAdd} sản phẩm`
                        : isAdded
                      ? "Đã thêm vào giỏ hàng"
                      : `Thêm vào giỏ hàng · ${formatVND(product.price * quantity)}`}
                  </button>
                </div>
                {product && <p className="text-xs text-[#65716A]" aria-live="polite">Còn {availableStock} sản phẩm khả dụng.</p>}
                {cartNotice && <p className="text-sm text-amber-800" role="status">{cartNotice}</p>}

              </div>
            </div>
            </div>
          )}
        </div>
      </main>

    </CustomerSiteFrame>
  );
}
