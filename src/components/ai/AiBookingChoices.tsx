"use client";

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api-client';
import { chatBookingReceipt, type ChatWorkflow, type ChatBookingReceipt } from '@/lib/ai-workflow';
import { useAuthStore } from '@/stores/auth-store';
import { QuickAuthModal } from '@/components/auth/quick-auth-modal';

interface Pet { id: string; name: string; species: 'CAT' | 'DOG'; weightKg: number }
interface Service { id: string; name: string; category: string; isAddon: boolean; priceTiers: { species: string | null; minWeight: number; maxWeight: number; price: number }[] }
interface Quote { token: string; expiresAt: number; pet: Pet; services: { id: string; name: string; price: number }[]; total: number; startAt: string }
const money = (amount: number) => `${Number(amount).toLocaleString('vi-VN')}đ`;

function supports(service: Service, pet: Pet | undefined): boolean {
  if (!pet || pet.weightKg > 20) return false;
  const specific = service.priceTiers.filter(tier => tier.species === pet.species);
  const tiers = specific.length ? specific : service.priceTiers.filter(tier => !tier.species);
  return tiers.some(tier => pet.weightKg >= tier.minWeight && (pet.weightKg < tier.maxWeight || tier.maxWeight === 20 && pet.weightKg === 20));
}

export function AiBookingChoices({ workflow, active = true, onCompleted }: { workflow: ChatWorkflow; active?: boolean; onCompleted?: (content: string) => void }) {
  const user = useAuthStore(state => state.user);
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const customer = authenticated && user?.role === 'CUSTOMER';
  const queryClient = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [petId, setPetId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [addons, setAddons] = useState<string[]>([]);
  const [date, setDate] = useState(workflow.date || '');
  const [time, setTime] = useState('');
  const [weightAccepted, setWeightAccepted] = useState(false);
  const [quote, setQuote] = useState<{ value: Quote; ownerId: string } | null>(null);
  const [receipt, setReceipt] = useState<{ value: ChatBookingReceipt; petName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const options = useQuery({ queryKey: ['ai', 'booking-options', user?.id], queryFn: () => apiClient.get<{ pets: Pet[]; services: Service[] }>('/ai/booking/options'), enabled: customer && active });
  const pet = options.data?.pets.find(item => item.id === petId);
  const serviceIds = [serviceId, ...addons].filter(Boolean);
  const slots = useQuery({
    queryKey: ['ai', 'slots', user?.id, date, serviceId, addons],
    queryFn: () => apiClient.post<{ date: string; slots: { time: string; available: boolean; remaining: number }[] }>('/ai/booking/slots', { date, serviceIds }),
    enabled: customer && active && !!date && !!serviceId && !!pet,
    staleTime: 0,
  });
  const selectedSlot = slots.data?.slots.find(slot => slot.time === time && slot.available && slot.remaining > 0);
  const currentQuote = quote && quote.ownerId === user?.id ? quote.value : null;
  const expired = !!currentQuote && currentQuote.expiresAt <= now;
  useEffect(() => {
    if (!currentQuote) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [currentQuote]);

  function resetReview() { setQuote(null); setError(''); }

  async function review() {
    if (lock.current || !active || !pet || !customer || !selectedSlot || !weightAccepted) return;
    lock.current = true; setBusy(true); setError(''); setQuote(null);
    try {
      const value = await apiClient.post<Quote>('/ai/booking/preview', { petId, serviceIds, startAt: `${date}T${time}:00+07:00` });
      setNow(Date.now()); setQuote({ value, ownerId: user.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa kiểm tra được lịch. Bạn thử lại nhé.');
      void slots.refetch();
    } finally { lock.current = false; setBusy(false); }
  }

  async function confirm() {
    if (lock.current || !active || !currentQuote || expired || !customer) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const created = await apiClient.post<ChatBookingReceipt>('/ai/booking/confirm', { token: currentQuote.token });
      setReceipt({ value: created, petName: currentQuote.pet.name }); setQuote(null);
      onCompleted?.(chatBookingReceipt(created, currentQuote.pet.name));
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['ai', 'slots'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa nhận được kết quả. Bạn có thể xác nhận lại; cùng bản xác nhận sẽ không tạo trùng.');
      if (cause instanceof ApiError && cause.status !== 0 && cause.status < 500) {
        setQuote(null); setTime(''); void options.refetch(); void slots.refetch();
      }
    } finally { lock.current = false; setBusy(false); }
  }

  const field = 'mt-1 w-full min-w-0 rounded-lg border bg-white p-2 text-xs';
  if (receipt) return <section aria-label="Kết quả xác nhận lịch" className="mt-3 space-y-2 rounded-xl bg-teal-50 p-3 text-xs"><p className="whitespace-pre-line break-words">{chatBookingReceipt(receipt.value, receipt.petName).replace(/\*\*/g, '').replace(/\[Lịch của tôi\]\(\/tai-khoan\)/g, 'Lịch của tôi')}</p><Link href="/tai-khoan" className="inline-block rounded-lg border p-2 underline">Xem lịch của tôi</Link></section>;
  if (!active) return <p className="mt-3 text-xs text-neutral-500">Bạn đã chuyển sang yêu cầu khác. Lựa chọn này không còn dùng để xác nhận; bạn có thể yêu cầu đặt lịch lại.</p>;

  return (
    <section aria-label="Đặt lịch trong chat" className="mt-3 min-w-0 space-y-3 border-t border-teal-100 pt-3 text-xs">
      {!customer ? <div className="space-y-2"><p>{authenticated ? 'Bạn cần tài khoản khách hàng để đặt lịch cho bé.' : 'Bạn đăng nhập để chọn hồ sơ thú cưng của mình nhé. Chưa tạo lịch ở bước này.'}</p>{!authenticated && <button type="button" onClick={() => setAuthOpen(true)} className="rounded-lg bg-teal-800 p-2 text-white">Đăng nhập để chọn lịch</button>}</div> : <>
        {options.isLoading && <p role="status">Đang lấy hồ sơ và dịch vụ...</p>}
        {options.isError && <p role="alert">Chưa tải được hồ sơ. <button type="button" className="underline" onClick={() => options.refetch()}>Thử lại</button></p>}
        {options.data && !options.data.pets.length && <p>Bạn chưa có hồ sơ thú cưng đang hoạt động. <Link href="/tai-khoan" className="underline">Thêm hồ sơ của bé</Link> rồi quay lại chat.</p>}
        {options.data && options.data.pets.length > 0 && <>
          <label className="block">Chọn bé
            <select value={petId} onChange={event => { setPetId(event.target.value); setServiceId(''); setAddons([]); setTime(''); setWeightAccepted(false); resetReview(); }} disabled={busy} className={field}><option value="">Chọn hồ sơ thú cưng</option>{options.data.pets.map(item => <option key={item.id} value={item.id}>{item.name} · {item.species === 'CAT' ? 'Mèo' : 'Chó'} · {item.weightKg} kg</option>)}</select>
          </label>
          {pet && <>
            <label className="flex items-start gap-2"><input type="checkbox" checked={weightAccepted} disabled={busy} onChange={event => { setWeightAccepted(event.target.checked); resetReview(); }} className="mt-0.5" /><span>Cân nặng ước tính {pet.weightKg} kg trong hồ sơ còn đúng. Nếu thay đổi, <Link href="/tai-khoan" className="underline">cập nhật hồ sơ</Link> rồi tải lại.</span></label>
            {pet.weightKg > 20 && <p role="alert">Rất tiếc, dịch vụ hiện chỉ nhận thú cưng đến tối đa 20 kg.</p>}
            <label className="block">Dịch vụ chính
              <select value={serviceId} disabled={busy} onChange={event => { setServiceId(event.target.value); setAddons([]); setTime(''); resetReview(); }} className={field}><option value="">Chọn dịch vụ</option>{options.data.services.filter(item => !item.isAddon && supports(item, pet)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </label>
            {serviceId && <fieldset className="space-y-2"><legend className="mb-1">Tiện ích thêm, nếu cần</legend>{options.data.services.filter(item => item.isAddon && supports(item, pet)).map(item => <label key={item.id} className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={addons.includes(item.id)} onChange={event => { setAddons(old => event.target.checked ? [...old, item.id] : old.filter(id => id !== item.id)); setTime(''); resetReview(); }} className="mt-0.5" /><span className="break-words">{item.name}</span></label>)}</fieldset>}
            <label className="block">Ngày muốn đến<input type="date" value={date} disabled={busy} min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} onChange={event => { setDate(event.target.value); setTime(''); resetReview(); }} className={field} /></label>
            {slots.isFetching && <p role="status">Đang kiểm tra giờ còn chỗ...</p>}
            {slots.isError && <p role="alert">{slots.error instanceof Error ? slots.error.message : 'Chưa tra được giờ.'} <button type="button" className="underline" onClick={() => slots.refetch()}>Thử lại</button></p>}
            {slots.data && <fieldset><legend className="mb-2">Chọn giờ bắt đầu</legend><div className="flex flex-wrap gap-2">{slots.data.slots.filter(slot => slot.available && slot.remaining > 0).map(slot => <button type="button" key={slot.time} aria-pressed={time === slot.time} disabled={busy} onClick={() => { setTime(slot.time); resetReview(); }} className={`rounded-lg border p-2 ${time === slot.time ? 'bg-teal-800 text-white' : 'bg-white'}`}>{slot.time} · {slot.remaining} chỗ</button>)}</div>{!slots.data.slots.some(slot => slot.available && slot.remaining > 0) && <p>Ngày này chưa còn khung có thể đặt. Bạn chọn ngày khác nhé.</p>}</fieldset>}
            {!currentQuote && <button type="button" onClick={review} disabled={busy || !selectedSlot || !weightAccepted} className="w-full rounded-lg bg-teal-800 p-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'Đang kiểm tra...' : 'Xem lại lịch trước khi đặt'}</button>}
          </>}
        </>}
      </>}
      {currentQuote && <div className="space-y-2 rounded-xl bg-teal-50 p-3" aria-label="Xác nhận lịch hẹn">
        <p className="font-semibold">Kiểm tra lịch cho {currentQuote.pet.name} · {currentQuote.pet.weightKg} kg</p>
        <p>{new Date(currentQuote.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
        {currentQuote.services.map(line => <p key={line.id} className="break-words">{line.name}: {money(line.price)}</p>)}
        <p className="font-semibold">Tổng dự kiến: {money(currentQuote.total)}</p>
        <p>Chưa tạo lịch. Thu tiền tại quầy khi đón bé; nhân viên cân lại và thống nhất giá trước khi làm.</p>
        {expired ? <p role="status">Bản xem trước đã hết hạn. Bạn bấm xem lại lịch để lấy giá và giờ mới.</p> : <button type="button" onClick={confirm} disabled={busy} className="w-full rounded-lg bg-teal-800 p-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'Đang xác nhận...' : 'Xác nhận đặt lịch'}</button>}
        <button type="button" disabled={busy} onClick={() => setQuote(null)} className="w-full rounded-lg border p-2">{expired ? 'Xem lại lịch' : 'Quay lại chọn'}</button>
      </div>}
      {error && <p role="alert" className="break-words text-red-700">{error}</p>}
      <QuickAuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </section>
  );
}
