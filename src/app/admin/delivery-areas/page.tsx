"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminDeliveryAreas, useSaveDeliveryArea, type DeliveryArea } from "@/hooks/use-delivery-areas";
import { getDeliveryAreaToggleInput } from "@/lib/delivery-area-input";

const formatVND = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

export default function AdminDeliveryAreasPage() {
  const areasQuery = useAdminDeliveryAreas();
  const save = useSaveDeliveryArea();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [fee, setFee] = useState("");

  const startEdit = (area: DeliveryArea) => {
    setEditingId(area.id);
    setProvince(area.province);
    setWard(area.ward);
    setFee(String(area.fee));
  };

  const reset = () => {
    setEditingId(undefined);
    setProvince("");
    setWard("");
    setFee("");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(fee);
    if (!province.trim() || !ward.trim() || !Number.isInteger(amount) || amount < 0) {
      toast.error("Nhập tỉnh/thành, phường/xã và phí giao không âm.");
      return;
    }
    try {
      await save.mutateAsync({ id: editingId, province: province.trim(), ward: ward.trim(), fee: amount, isActive: editingId ? areasQuery.data?.find((area) => area.id === editingId)?.isActive ?? true : true });
      toast.success(editingId ? "Đã cập nhật khu vực giao." : "Đã thêm khu vực giao.");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chưa thể lưu khu vực giao.");
    }
  };

  const toggle = async (area: DeliveryArea) => {
    try {
      await save.mutateAsync(getDeliveryAreaToggleInput(area));
      toast.success(area.isActive ? "Đã ngừng nhận giao khu vực này." : "Đã bật lại khu vực giao.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chưa thể đổi trạng thái khu vực.");
    }
  };

  return (
    <AdminPageShell>
      <AdminPageHeader section="Bán hàng" subsection="Khu vực giao" title="Khu vực và phí giao hàng" description="Chỉ các phường/xã đang bật mới xuất hiện ở checkout. Phí của đơn đã tạo được giữ nguyên." onRefresh={() => areasQuery.refetch()} isRefreshing={areasQuery.isFetching} />
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-border-subtle bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm"><span className="font-semibold">Tỉnh/thành</span><Input value={province} onChange={(event) => setProvince(event.target.value)} maxLength={100} required /></label>
        <label className="space-y-1 text-sm"><span className="font-semibold">Phường/xã</span><Input value={ward} onChange={(event) => setWard(event.target.value)} maxLength={100} required /></label>
        <label className="space-y-1 text-sm"><span className="font-semibold">Phí giao (đồng)</span><Input type="number" min={0} step={1} value={fee} onChange={(event) => setFee(event.target.value)} required /></label>
        <div className="flex items-end gap-2"><Button type="submit" disabled={save.isPending} className="min-w-0 flex-1">{editingId ? "Lưu thay đổi" : "Thêm khu vực"}</Button>{editingId && <Button type="button" variant="outline" onClick={reset}>Hủy sửa</Button>}</div>
      </form>
      {areasQuery.isError ? <p role="alert" className="text-sm text-rose-700">Không tải được khu vực giao. Hãy thử tải lại.</p> : areasQuery.isLoading ? <p className="text-sm text-muted-text">Đang tải khu vực giao...</p> : !areasQuery.data?.length ? <p className="rounded-2xl border border-border-subtle bg-surface p-5 text-sm text-muted-text">Chưa cấu hình khu vực nào; khách chỉ có thể nhận tại cửa hàng.</p> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {areasQuery.data.map((area) => <article key={area.id} className="min-w-0 rounded-2xl border border-border-subtle bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words font-bold text-ink">{area.ward}</h2><p className="break-words text-sm text-muted-text">{area.province}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${area.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{area.isActive ? "Đang nhận giao" : "Tạm ngưng"}</span></div>
            <p className="text-lg font-bold text-admin-primary">{formatVND(area.fee)}</p>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => startEdit(area)}>Sửa</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={() => void toggle(area)}>{area.isActive ? "Tạm ngưng" : "Bật lại"}</Button></div>
          </article>)}
        </div>
      )}
    </AdminPageShell>
  );
}
