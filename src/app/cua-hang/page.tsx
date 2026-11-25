"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useProducts, Product } from "@/hooks/use-products";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { ShoppingBag, Star, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import type { Product as CartProduct } from "@/types";
import { getProductCategoryLabel } from "@/lib/product-category";
import { getProductDetailHref, getProductLoginHref } from "@/lib/product-detail-url";
import { getAvailableProductStock } from "@/lib/product-stock";

export default function ShopPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState("");

  const { data: apiProducts, isLoading } = useProducts({
    category: selectedCategory === "ALL" ? undefined : selectedCategory,
  });

  const addItem = useCartStore((state) => state.addItem);

  const categories = [
    { id: "ALL", label: "Tất cả sản phẩm" },
    { id: "CARE", label: "Chăm sóc" },
    { id: "FOOD", label: "Thức ăn" },
    { id: "SNACK", label: "Bánh thưởng" },
    { id: "ACCESSORY", label: "Phụ kiện" },
  ];

  const filteredProducts = apiProducts || [];

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      router.push(getProductLoginHref(product.slug));
      return;
    }
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice ?? undefined,
      category: product.category.toLowerCase() as CartProduct["category"],
      categoryLabel: product.category,
      imageUrl: product.imageUrl || "",
      isBestSeller: product.isBestSeller,
      isNew: product.isNew,
      stock: product.stock,
      reservedStock: product.reservedStock,
      rating: product.rating,
      reviewCount: product.reviewCount,
      specifications: product.specifications ?? [],
    };

    const added = addItem(cartProduct, 1);
    if (!added) {
      setCartNotice(`Hiện chỉ còn ${getAvailableProductStock(product)} sản phẩm có thể thêm vào giỏ.`);
      return;
    }
    setCartNotice("");
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const revealRef = useScrollReveal(".reveal", { y: 40, stagger: 0.1 });

  return (
    <CustomerSiteFrame containerRef={revealRef}>
      <main className="flex-1 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
          <section className="shop-collection-hero reveal" aria-labelledby="shop-title">
            <div className="shop-collection-hero__copy">
              <p className="customer-page-intro__eyebrow">Cửa hàng PetCare</p>
              <h1 id="shop-title">Thức ăn và đồ dùng cho bé.</h1>
              <p>Chọn sản phẩm cho chó mèo. Bạn có thể nhận tại cửa hàng hoặc chọn giao nếu địa chỉ nằm trong khu vực phục vụ.</p>
              <Link href="/gio-hang" className="customer-primary-action"><ShoppingBag className="size-4" aria-hidden="true" /> Xem giỏ hàng</Link>
            </div>
            <div className="shop-collection-hero__visual" aria-hidden="true">
              <img src="/images/shop-essentials-hero.jpg" alt="" />
              <span className="customer-hero-image-caption">Hình ảnh minh họa</span>
            </div>
          </section>

          {/* Category Filter Pills */}
          <div className="mb-8 grid grid-cols-2 gap-x-4 gap-y-1 border-b border-[#DEDAD0] reveal sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-12 shrink-0 border-b-2 px-1 text-sm font-medium whitespace-nowrap transition-colors btn-tactile ${
                  selectedCategory === cat.id
                    ? "border-[#244B3F] text-[#244B3F]"
                    : "border-transparent text-[#65716A] hover:text-[#1B3C33]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {cartNotice && <p className="mb-5 text-sm text-amber-800" role="status">{cartNotice}</p>}

          {/* Product Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20 reveal">
              <Loader2 className="w-8 h-8 animate-spin text-[#244B3F]" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border-y border-[#DEDAD0] py-16 text-sm text-[#65716A] reveal">
              <p className="font-medium text-[#1B3C33]">Chưa có sản phẩm trong danh mục này.</p>
              <p className="mt-2">Chọn danh mục khác hoặc quay lại sau.</p>
            </div>
          ) : (
            <div className="mb-16 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-8">
              {filteredProducts.map((product) => {
                const availableStock = getAvailableProductStock(product);
                return (
                <article key={product.id} className="customer-product-card group flex min-w-0 flex-col reveal">
                  <div className="customer-product-card__image relative aspect-[0.9/1]">
                    <img
                      src={product.imageUrl || "/product-placeholder.svg"}
                      alt={product.imageUrl ? product.name : "Ảnh sản phẩm đang cập nhật"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      onError={(event) => {
                        if (!event.currentTarget.src.endsWith("/product-placeholder.svg")) {
                          event.currentTarget.src = "/product-placeholder.svg";
                        }
                      }}
                    />
                    <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5 sm:left-4 sm:top-4">
                      {product.isBestSeller && <span className="bg-[#E5ECE3] px-2.5 py-1 text-[10px] font-semibold text-[#1B3C33]">Nổi bật</span>}
                      {product.isNew && <span className="bg-[#1B3C33] px-2.5 py-1 text-[10px] font-semibold text-white">Sản phẩm mới</span>}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col pt-3 sm:pt-4">
                    <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] text-[#65716A] sm:text-xs">
                      <span className="min-w-0 truncate font-medium text-[#244B3F]">{getProductCategoryLabel(product.category)}</span>
                      <div className="flex shrink-0 items-center gap-1 font-semibold text-[#8A9A7A]">
                        <Star className="size-3 fill-current sm:size-3.5" />
                        <span>{product.rating}</span>
                        <span className="text-[#65716A]">({product.reviewCount})</span>
                      </div>
                    </div>

                    <Link href={getProductDetailHref(product.slug)} className="mt-2 block min-w-0">
                      <h3 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 text-[#1B3C33] transition-colors hover:text-[#244B3F] sm:text-base">{product.name}</h3>
                    </Link>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#65716A]">{product.description}</p>

                    <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold tabular-nums text-[#1B3C33] sm:text-base">{formatVND(product.price)}</div>
                        {product.originalPrice !== null && product.originalPrice > product.price && <div className="text-xs text-[#65716A] line-through">{formatVND(product.originalPrice)}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={availableStock <= 0}
                        aria-label={availableStock <= 0 ? `${product.name}: hết hàng` : `Thêm ${product.name} vào giỏ`}
                        data-floating-contact-safe-zone
                        className={`btn-tactile inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-[#DEDAD0] disabled:text-[#65716A] sm:px-4 sm:text-xs ${justAddedId === product.id ? "bg-[#637650] text-white" : "bg-[#244B3F] text-white hover:bg-[#1B3C33]"}`}
                      >
                        {availableStock <= 0 ? "Hết hàng" : justAddedId === product.id ? "Đã thêm" : "Thêm vào giỏ"}
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

    </CustomerSiteFrame>
  );
}
