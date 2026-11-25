import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { Product, CartItem } from "@/types";
import { getAvailableProductStock } from "@/lib/product-stock";
interface CartStore {
  items: CartItem[];
  appliedVoucherCode: string | null;
  voucherDiscount: number;
  addItem: (product: Product, quantity?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => boolean;
  applyVoucher: (code: string) => boolean;
  removeVoucher: () => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getFinalTotal: () => number;
}

export const createCartStore = (storage?: StateStorage) => create<CartStore>()(persist((set, get) => ({
  items: [],
  appliedVoucherCode: null,
  voucherDiscount: 0,

  addItem: (product, quantity = 1) => {
    if (!Number.isInteger(quantity) || quantity < 1) return false;

    const existingQuantity = get().items.find((item) => item.product.id === product.id)?.quantity ?? 0;
    if (existingQuantity + quantity > getAvailableProductStock(product)) return false;

    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { product, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      return { items: [...state.items, { product, quantity }] };
    });
    return true;
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return true;
    }

    if (!Number.isInteger(quantity)) return false;
    const item = get().items.find((cartItem) => cartItem.product.id === productId);
    if (!item || quantity > getAvailableProductStock(item.product)) return false;

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
    return true;
  },

  applyVoucher: (code) => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed === "WELCOME50" && get().getSubtotal() >= 150000) {
      set({ appliedVoucherCode: "WELCOME50", voucherDiscount: 50000 });
      return true;
    }
    if (trimmed === "SPANEW20") {
      const discount = Math.min(Math.round(get().getSubtotal() * 0.2), 80000);
      set({ appliedVoucherCode: "SPANEW20", voucherDiscount: discount });
      return true;
    }
    return false;
  },

  removeVoucher: () => {
    set({ appliedVoucherCode: null, voucherDiscount: 0 });
  },

  clearCart: () => {
    set({ items: [], appliedVoucherCode: null, voucherDiscount: 0 });
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  },

  getFinalTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().voucherDiscount;
    return Math.max(0, subtotal - discount);
  },
}), {
  name: 'petcare_cart_session',
  storage: createJSONStorage(() => storage ?? sessionStorage),
  partialize: state => ({ items: state.items }),
  skipHydration: true,
}));

export const useCartStore = createCartStore();

type CartAccount = { user: { id: string } | null };

export function bindCartToAccount(
  cart: ReturnType<typeof createCartStore>,
  subscribe: (listener: (state: CartAccount, previous: CartAccount) => void) => () => void,
) {
  return subscribe((state, previous) => {
    if (previous.user?.id && state.user?.id !== previous.user.id) cart.getState().clearCart();
  });
}
