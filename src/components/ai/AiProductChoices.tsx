"use client";

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { chatProductToCart, validateChatCartSelection, type ChatProduct, type ChatWorkflow } from '@/lib/ai-workflow';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { QuickAuthModal } from '@/components/auth/quick-auth-modal';
import { getAvailableProductStock } from '@/lib/product-stock';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')}đ`;

export function AiProductChoices({ workflow, active = true, onCompleted }: { workflow: ChatWorkflow; active?: boolean; onCompleted?: (content: string) => void }) {
  const user = useAuthStore(state => state.user);
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const [species, setSpecies] = useState(workflow.species || '');
  const [search, setSearch] = useState(workflow.search || '');
  const [category, setCategory] = useState(workflow.category || '');
  const [quantity, setQuantity] = useState(1);
  const [review, setReview] = useState<{ product: ChatProduct; userId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const products = useQuery({
    queryKey: ['ai', 'products', species, workflow.weightKg],
    queryFn: () => apiClient.get<ChatProduct[]>('/products/recommend', { params: { species: species || undefined, weightKg: workflow.weightKg } }),
    enabled: active,
  });
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd');
  const available = (products.data || workflow.products || []).filter(product => getAvailableProductStock(product) > 0 && Number(product.price) > 0
    && (!category || product.category === category)
    && normalize(`${product.name} ${product.description || ''}`).includes(normalize(search.trim())));

  async function choose(product: ChatProduct) {
    if (lock.current || !active) return;
    if (!authenticated) { setAuthOpen(true); return; }
    if (user?.role !== 'CUSTOMER') { setNotice('Bạn dùng tài khoản khách hàng để mua hàng nhé.'); return; }
    lock.current = true; setBusy(true); setNotice(''); setReview(null); setQuantity(1);
    try {
      const fresh = await apiClient.get<ChatProduct>(`/products/${encodeURIComponent(product.slug)}`);
      const inCart = useCartStore.getState().items.find(item => item.product.id === fresh.id)?.quantity || 0;
      const error = validateChatCartSelection(fresh, 1, inCart);
      if (error) throw new Error(error);
      setReview({ product: fresh, userId: user.id });
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Mình chưa kiểm tra được sản phẩm. Bạn thử lại nhé.'); }
    finally { lock.current = false; setBusy(false); }
  }

  async function confirm() {
    if (!review || lock.current || !active) return;
    if (!authenticated || review.userId !== user?.id) { setReview(null); setNotice('Phiên đăng nhập đã đổi. Bạn chọn lại sản phẩm nhé.'); return; }
    lock.current = true; setBusy(true); setNotice('');
    try {
      const fresh = await apiClient.get<ChatProduct>(`/products/${encodeURIComponent(review.product.slug)}`);
      const cart = useCartStore.getState();
      const existing = cart.items.find(item => item.product.id === fresh.id)?.quantity || 0;
      const error = validateChatCartSelection(fresh, quantity, existing, Number(review.product.price));
      if (error) { setReview({ product: fresh, userId: user.id }); throw new Error(error); }
      const added = cart.addItem(chatProductToCart(fresh), quantity);
      if (!added) throw new Error(`Hiện chỉ còn ${Math.max(0, getAvailableProductStock(fresh) - existing)} sản phẩm có thể thêm vào giỏ.`);
      setNotice(`Đã thêm ${quantity} × ${fresh.name} vào giỏ. Chưa tạo đơn hoặc thu tiền.`);
      onCompleted?.(`Đã thêm ${quantity} × ${fresh.name} (${money(fresh.price)} mỗi món) vào giỏ. Chưa tạo đơn hoặc thu tiền.\n\nBạn kiểm tra số lượng và thanh toán tại [Giỏ hàng](/gio-hang). Đơn chỉ nhận tại cửa hàng.`);
      setReview(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Chưa thêm được vào giỏ. Bạn thử lại nhé.'); }
    finally { lock.current = false; setBusy(false); }
  }

  if (!active) return <p className="mt-3 text-xs text-neutral-500">Bạn đã chuyển sang yêu cầu khác. Hỏi lại sản phẩm để mở lựa chọn mới nhé.</p>;

  return (
    <section className="mt-3 min-w-0 space-y-3 border-t border-teal-100 pt-3" aria-label="Chọn sản phẩm trong chat">
      <label className="block text-xs">Tìm tên sản phẩm
        <input value={search} onChange={event => { setSearch(event.target.value); setReview(null); }} className="mt-1 w-full min-w-0 rounded-lg border p-2" placeholder="Ví dụ: Ciao Churu" />
      </label>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <label className="min-w-0 text-xs">Dành cho
          <select value={species} onChange={event => { setSpecies(event.target.value); setReview(null); }} className="mt-1 w-full min-w-0 rounded-lg border p-2"><option value="">Chó và mèo</option><option value="DOG">Chó</option><option value="CAT">Mèo</option></select>
        </label>
        <label className="min-w-0 text-xs">Nhóm hàng
          <select value={category} onChange={event => { setCategory(event.target.value); setReview(null); }} className="mt-1 w-full min-w-0 rounded-lg border p-2"><option value="">Tất cả</option><option value="FOOD">Thức ăn</option><option value="SNACK">Bánh thưởng</option><option value="CARE">Chăm sóc</option><option value="ACCESSORY">Phụ kiện</option></select>
        </label>
      </div>
      {products.isLoading && <p role="status" className="text-xs">Đang kiểm tra hàng...</p>}
      {products.isError && <p role="alert" className="text-xs">Chưa tải được sản phẩm. <button type="button" onClick={() => products.refetch()} className="underline">Thử lại</button></p>}
      {!products.isLoading && !products.isError && !available.length && <p className="text-xs">Chưa có hàng còn bán theo bộ lọc này. Bạn thử đổi loài, nhóm hàng hoặc tên nhé.</p>}
      {available.slice(0, 6).map(product => (
        <article key={product.id} className="flex min-w-0 gap-2 rounded-xl border p-2">
          {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-14 w-14 shrink-0 rounded-lg object-contain" />}
          <div className="min-w-0 flex-1 space-y-1 text-xs">
            <Link href={`/cua-hang/${product.slug}`} className="block break-words font-semibold underline">{product.name}</Link>
            <p>{money(product.price)} · Còn {getAvailableProductStock(product)}</p>
            {product.description && <p className="line-clamp-3 break-words text-neutral-600">{product.description}</p>}
            <button type="button" disabled={busy} onClick={() => choose(product)} className="rounded-lg bg-teal-800 px-3 py-2 text-white disabled:opacity-50">Chọn sản phẩm</button>
          </div>
        </article>
      ))}
      {review && review.userId === user?.id && (
        <div className="space-y-2 rounded-xl bg-teal-50 p-3 text-xs" aria-label="Xác nhận thêm giỏ">
          <p className="break-words font-semibold">{review.product.name} · {money(review.product.price)}</p>
          <label className="block">Số lượng <input aria-label="Số lượng thêm giỏ" type="number" min={1} max={99} value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="ml-2 w-16 rounded border bg-white p-2" /></label>
          <p>Tạm tính: {money(review.product.price * quantity)}</p>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={confirm} className="rounded-lg bg-teal-800 px-3 py-2 text-white disabled:opacity-50">{busy ? 'Đang kiểm tra...' : 'Xác nhận thêm giỏ'}</button><button type="button" disabled={busy} onClick={() => setReview(null)} className="rounded-lg border px-3 py-2">Bỏ chọn</button></div>
        </div>
      )}
      {notice && <p role="status" className="break-words text-xs">{notice}</p>}
      <Link href="/gio-hang" className="inline-block rounded-lg border border-teal-800 px-3 py-2 text-xs font-semibold text-teal-900">Xem giỏ và thanh toán</Link>
      <p className="text-xs text-neutral-500">Nhận tại cửa hàng. Giá và tồn được kiểm tra lại khi tạo đơn.</p>
      <QuickAuthModal purpose="shopping" isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); setNotice('Đã đăng nhập. Bạn chọn sản phẩm để xem lại trước khi thêm giỏ nhé.'); }} />
    </section>
  );
}
