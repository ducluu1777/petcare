import type { BookingRecord } from "@/lib/admin-booking-record";

function formatVND(amount: number) {
  return `${amount.toLocaleString("vi-VN")}₫`;
}

export function BookingPaymentReceiptPrint({ booking }: { booking: BookingRecord }) {
  const totalPaid = booking.financial.finalAmount + booking.latePickupFeeAmount;
  const printedAt = new Date().toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <section className="booking-payment-receipt-print hidden print:block" aria-label="Hóa đơn thanh toán">
      <header className="border-b border-dashed border-black pb-3 text-center">
        <p className="text-lg font-black tracking-wide">PETCARE</p>
        <h1 className="mt-1 text-base font-bold">HÓA ĐƠN THANH TOÁN</h1>
        <p className="mt-1 text-xs">Mã lịch: {booking.code}</p>
      </header>

      <dl className="space-y-1 border-b border-dashed border-black py-3 text-xs">
        <div className="flex justify-between gap-2"><dt>Khách hàng</dt><dd className="text-right font-semibold">{booking.customer.name}</dd></div>
        {booking.customer.phone && <div className="flex justify-between gap-2"><dt>Điện thoại</dt><dd className="text-right">{booking.customer.phone}</dd></div>}
        <div className="flex justify-between gap-2"><dt>Thú cưng</dt><dd className="text-right font-semibold">{booking.pet.name} · {booking.pet.species}</dd></div>
        <div className="flex justify-between gap-2"><dt>Ngày in</dt><dd className="text-right">{printedAt}</dd></div>
      </dl>

      <div className="space-y-2 border-b border-dashed border-black py-3 text-xs">
        {booking.service.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">{item.name}{item.isAddon ? " · Bổ sung" : ""}</span>
            <span className="shrink-0 whitespace-nowrap">{formatVND(item.price)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-2 pt-1"><span>Tạm tính</span><span className="whitespace-nowrap">{formatVND(booking.financial.subtotal)}</span></div>
        {booking.financial.discount > 0 && (
          <div className="flex justify-between gap-2"><span>Ưu đãi</span><span className="whitespace-nowrap">−{formatVND(booking.financial.discount)}</span></div>
        )}
        <div className="flex justify-between gap-2 font-semibold"><span>Tiền dịch vụ</span><span className="whitespace-nowrap">{formatVND(booking.financial.finalAmount)}</span></div>
        {booking.latePickupFeeAmount > 0 && (
          <div className="flex justify-between gap-2"><span>Chăm giữ sau giờ đóng cửa</span><span className="whitespace-nowrap">{formatVND(booking.latePickupFeeAmount)}</span></div>
        )}
      </div>

      <div className="space-y-1 py-3 text-xs">
        <div className="flex justify-between gap-2 text-sm font-black"><span>ĐÃ THANH TOÁN</span><span className="whitespace-nowrap">{formatVND(totalPaid)}</span></div>
        <div className="flex justify-between gap-2"><span>Phương thức</span><span>{booking.financial.paidMethod || "Đã thanh toán"}</span></div>
        <p className="pt-3 text-center">PetCare cảm ơn bạn và bé.</p>
      </div>
    </section>
  );
}
