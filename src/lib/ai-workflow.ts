import type { Product as CartProduct } from '@/types';
import { getAvailableProductStock } from '@/lib/product-stock';

export interface ChatProduct {
  id: string; name: string; slug: string; category: string; description: string | null;
  price: number; stock: number; reservedStock?: number; imageUrl: string | null; suitableSpecies?: 'CAT' | 'DOG' | null;
  isActive?: boolean; rating?: number; reviewCount?: number;
  specifications?: { label: string; value: string }[];
}

export interface ChatWorkflow {
  kind: 'products' | 'booking';
  species?: 'CAT' | 'DOG'; weightKg?: number; category?: string; date?: string;
  products?: ChatProduct[]; search?: string;
}

export interface ChatBookingReceipt { code: string; startAt: string; total: number; status: string }

export function chatBookingReceipt(receipt: ChatBookingReceipt, petName: string): string {
  const labels: Record<string, string> = { ARRIVED: 'Đã tiếp nhận', IN_SERVICE: 'Đang chăm sóc', READY_FOR_PICKUP: 'Chờ khách nhận', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến' };
  if (receipt.status !== 'BOOKED') {
    return `Lịch **${receipt.code}** của bé ${petName} hiện có trạng thái **${labels[receipt.status] || 'Cần kiểm tra'}**. Lần xác nhận này không tạo thêm lịch. Bạn xem thông tin hiện tại tại [Lịch của tôi](/tai-khoan).`;
  }
  return `Đặt lịch thành công: **${receipt.code}** cho bé ${petName}.\n${new Date(receipt.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Giá dự kiến ${Number(receipt.total).toLocaleString('vi-VN')}đ.\n\nThanh toán tại quầy khi đón bé; nhân viên cân lại và thống nhất giá trước khi làm. Bạn xem tại [Lịch của tôi](/tai-khoan).`;
}

export function validateChatCartSelection(product: ChatProduct, quantity: number, existingQuantity: number, reviewedPrice?: number): string | null {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return 'Bạn chọn số lượng từ 1 đến 99 nhé.';
  if (!product.id || !product.slug || product.isActive === false || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0) return 'Sản phẩm này hiện chưa thể thêm vào giỏ.';
  const availableStock = getAvailableProductStock(product);
  if (availableStock < quantity + existingQuantity) return `Sản phẩm chỉ còn ${Math.max(0, availableStock - existingQuantity)} món có thể thêm vào giỏ.`;
  if (reviewedPrice !== undefined && Number(product.price) !== reviewedPrice) return 'Giá vừa thay đổi. Bạn xem mức mới rồi xác nhận lại nhé.';
  return null;
}

export function chatProductToCart(product: ChatProduct): CartProduct {
  const categories: Record<string, CartProduct['category']> = { FOOD: 'food', SNACK: 'snack', CARE: 'care', ACCESSORY: 'accessory' };
  const labels: Record<string, string> = { FOOD: 'Thức ăn', SNACK: 'Bánh thưởng', CARE: 'Chăm sóc', ACCESSORY: 'Phụ kiện' };
  return { id: product.id, name: product.name, slug: product.slug, category: categories[product.category] || 'accessory', categoryLabel: labels[product.category] || 'Sản phẩm',
    description: product.description || '', price: Number(product.price), stock: product.stock, reservedStock: product.reservedStock,
    imageUrl: product.imageUrl || '', specifications: product.specifications || [], rating: product.rating || 0, reviewCount: product.reviewCount || 0 };
}
