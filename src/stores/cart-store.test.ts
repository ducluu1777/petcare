import { describe, expect, it } from 'bun:test';
import type { StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { bindCartToAccount, createCartStore } from './cart-store';
import { chatProductToCart } from '../lib/ai-workflow';

function memoryStorage(): StateStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}

const product = chatProductToCart({ id: 'ciao-qa', slug: 'ciao-qa', name: 'Ciao Churu QA', category: 'SNACK', price: 45000, stock: 10, description: '', imageUrl: null });

describe('cart after chat confirmation and reload', () => {
  it('does not add a product with no available stock', () => {
    const cart = createCartStore(memoryStorage());

    cart.getState().addItem({ ...product, stock: 0 });

    expect(cart.getState().items).toEqual([]);
  });

  it('does not let additions or quantity changes exceed available stock', () => {
    const cart = createCartStore(memoryStorage());
    const limitedProduct = { ...product, stock: 2 };

    cart.getState().addItem(limitedProduct, 2);
    cart.getState().addItem(limitedProduct, 1);
    cart.getState().updateQuantity(limitedProduct.id, 3);

    expect(cart.getState().items).toEqual([{ product: limitedProduct, quantity: 2 }]);
  });

  it('counts inventory reserved for other QR checkouts as unavailable', () => {
    const cart = createCartStore(memoryStorage());
    const partlyReservedProduct = { ...product, stock: 5, reservedStock: 3 };

    expect(cart.getState().addItem(partlyReservedProduct, 3)).toBe(false);
    expect(cart.getState().addItem(partlyReservedProduct, 2)).toBe(true);
    expect(cart.getState().updateQuantity(partlyReservedProduct.id, 3)).toBe(false);
    expect(cart.getState().items).toEqual([{ product: partlyReservedProduct, quantity: 2 }]);
  });

  it('restores confirmed products after client hydration, with the same quantity and subtotal', async () => {
    const storage = memoryStorage();
    const firstPage = createCartStore(storage);
    firstPage.getState().addItem(product, 2);
    const reloadedPage = createCartStore(storage);
    expect(reloadedPage.getState().items).toHaveLength(0);
    await reloadedPage.persist.rehydrate();
    expect(reloadedPage.getState().items).toHaveLength(1);
    expect(reloadedPage.getState().getTotalItems()).toBe(2);
    expect(reloadedPage.getState().getSubtotal()).toBe(90000);
  });
  it('does not restore a cart cleared after checkout or account change', async () => {
    const storage = memoryStorage();
    const firstPage = createCartStore(storage);
    firstPage.getState().addItem(product);
    firstPage.getState().clearCart();
    const reloadedPage = createCartStore(storage);
    await reloadedPage.persist.rehydrate();
    expect(reloadedPage.getState().items).toEqual([]);
  });
  it('refreshes a previous cart line with the current product price when confirming another item', () => {
    const cart = createCartStore(memoryStorage());
    cart.getState().addItem(product);
    cart.getState().addItem({ ...product, price: 50000 });
    expect(cart.getState().getTotalItems()).toBe(2);
    expect(cart.getState().getSubtotal()).toBe(100000);
  });
  it('clears persisted items on logout or switching customer, keeping them on profile refresh', async () => {
    for (const nextUser of [null, { id: 'other-customer' }]) {
      const storage = memoryStorage();
      const cart = createCartStore(storage);
      const account = createStore<{ user: { id: string } | null }>(() => ({ user: { id: 'customer' } }));
      const unsubscribe = bindCartToAccount(cart, account.subscribe);
      cart.getState().addItem(product);
      account.setState({ user: { id: 'customer' } });
      expect(cart.getState().items).toHaveLength(1);
      account.setState({ user: nextUser });
      expect(cart.getState().items).toEqual([]);
      const reloaded = createCartStore(storage);
      await reloaded.persist.rehydrate();
      expect(reloaded.getState().items).toEqual([]);
      unsubscribe();
    }
  });
});
