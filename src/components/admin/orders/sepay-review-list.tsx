"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompleteSepayReview, useSepayReview } from "@/hooks/use-sepay-review";
import { getDisplayLabel } from "@/lib/domain-labels";

export function SepayReviewList() {
  const reviewId = useSearchParams().get("reviewId");
  const query = useSepayReview(reviewId);
  const complete = useCompleteSepayReview();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const events = query.data ?? [];

  useEffect(() => {
    if (reviewId && !query.isLoading) document.getElementById("sepay-review")?.scrollIntoView({ block: "start" });
  }, [reviewId, query.isLoading]);

  const markComplete = async (id: string) => {
    try {
      await complete.mutateAsync({ id, note: notes[id]?.trim() ?? "" });
      toast.success("Đã lưu cách xử lý giao dịch.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu đối chiếu.");
    }
  };

  return (
    <section id="sepay-review" className="space-y-3 scroll-mt-6 rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5" aria-label="Giao dịch SePay cần đối chiếu">
      <div>
        <h2 className="text-base font-bold text-ink">{reviewId ? `Giao dịch SePay #${reviewId}` : `Giao dịch cần đối chiếu (${events.length})`}</h2>
        <p className="text-sm text-muted-text">Kiểm tra trên SePay và xử lý với khách trước khi ghi nhận hoàn tất ở đây. Đóng mục này không tự xác nhận tiền hay đổi trạng thái đơn.</p>
        {reviewId && <Link href="/admin/orders#sepay-review" className="mt-2 inline-block text-sm font-semibold text-admin-primary hover:underline">Xem danh sách cần đối chiếu</Link>}
      </div>
      {query.isError && <p role="alert" className="text-sm text-rose-700">Không tải được giao dịch cần đối chiếu.</p>}
      {!query.isLoading && !query.isError && events.length === 0 && <p className="text-sm text-muted-text">{reviewId ? "Giao dịch này không còn chờ đối chiếu." : "Không có giao dịch cần đối chiếu."}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {events.map((event) => (
          <div key={event.id} className="min-w-0 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{getDisplayLabel("sepayReason", event.reason)}</p>
                <p className="text-xs text-muted-text">SePay #{event.id} · {new Date(event.createdAt).toLocaleString("vi-VN")}</p>
              </div>
              <strong className="shrink-0 text-amber-900">{new Intl.NumberFormat("vi-VN").format(event.amount)}đ</strong>
            </div>
            <dl className="grid gap-1 text-xs text-muted-text">
              <div className="flex gap-2"><dt className="shrink-0">Mã QR:</dt><dd className="min-w-0 break-all text-ink">{event.paymentCode || "Không có"}</dd></div>
              <div className="flex gap-2"><dt className="shrink-0">Tài khoản:</dt><dd className="min-w-0 break-all text-ink">{event.accountNumber || "Không có"}</dd></div>
              <div className="flex gap-2"><dt className="shrink-0">Mã ngân hàng:</dt><dd className="min-w-0 break-all text-ink">{event.referenceCode || "Không có"}</dd></div>
              <div className="flex gap-2"><dt className="shrink-0">Đơn/lịch:</dt><dd className="min-w-0 break-all text-ink">{event.order ? `${event.order.code} · ${event.order.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}` : event.booking ? `${event.booking.code} · ${event.booking.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}` : "Chưa ghép"}</dd></div>
            </dl>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label={`Cách xử lý giao dịch ${event.id}`} value={notes[event.id] ?? ""} onChange={(e) => setNotes((old) => ({ ...old, [event.id]: e.target.value }))} placeholder="Đã kiểm tra, hoàn tiền hoặc liên hệ khách..." className="min-w-0 flex-1" />
              <Button type="button" disabled={complete.isPending || (notes[event.id]?.trim().length ?? 0) < 3} onClick={() => void markComplete(event.id)}>Đã xử lý</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
