import Image from "next/image";
import { AlertTriangle, Check, CheckCircle2, Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingCashierQrSectionProps } from "@/components/admin/bookings/booking-cashier-card.types";

export function BookingCashierQrSection({
  state,
  actions,
}: BookingCashierQrSectionProps) {
  const {
    selectedBooking,
    cashierMethod,
    isPaying,
    effectiveRemaining,
    qrPaymentIntent,
    sepayAccount,
    sepayAccountLoading,
    bookingQrImageUrl,
    copiedField,
  } = state;

  return (
    <>
      {qrPaymentIntent?.status === "REVIEW" && cashierMethod !== "VIETQR" && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Giao dịch QR cần hỗ trợ đối chiếu. Chưa thu thêm tiền.
        </p>
      )}

      {cashierMethod === "VIETQR" && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-slate-50 p-4 text-center">
          <div className="group relative mx-auto flex h-52 w-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface p-2 shadow-xs">
            {qrPaymentIntent?.status === "PENDING" && bookingQrImageUrl ? (
              <Image
                src={bookingQrImageUrl}
                alt={`VietQR ${selectedBooking.code}`}
                width={192}
                height={192}
                unoptimized
                className="h-full w-full rounded-lg object-contain"
                loading="lazy"
              />
            ) : qrPaymentIntent?.status === "PENDING" ? (
              <div role="alert" className="flex flex-col items-center justify-center p-4 text-amber-800">
                <AlertTriangle aria-hidden="true" className="mb-2 size-10" />
                <span className="text-center text-sm font-semibold">Chưa cấu hình tài khoản nhận VietQR</span>
              </div>
            ) : qrPaymentIntent?.status === "COMPLETED" ? (
              <div className="flex flex-col items-center justify-center p-4 text-emerald-600">
                <CheckCircle2 aria-hidden="true" className="mb-2 size-12" />
                <span className="text-sm font-bold">Đã xác nhận thanh toán</span>
              </div>
            ) : qrPaymentIntent?.status === "REVIEW" ? (
              <div className="flex flex-col items-center justify-center p-4 text-amber-700">
                <AlertTriangle aria-hidden="true" className="mb-2 size-12" />
                <span className="text-sm font-bold">Khoản chuyển cần kiểm tra</span>
              </div>
            ) : qrPaymentIntent?.expired ? (
              <div className="flex flex-col items-center justify-center p-4 text-amber-700">
                <AlertTriangle aria-hidden="true" className="mb-2 size-12" />
                <span className="text-sm font-bold">Mã QR đã hết hạn</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-muted-text">
                <QrCode aria-hidden="true" className="mb-2 size-12" />
                <span className="text-sm font-semibold">Tạo mã QR để khách thanh toán</span>
              </div>
            )}
          </div>

          {qrPaymentIntent?.status === "PENDING" && (
            <div className="space-y-2 text-sm font-medium text-primary">
              <p>Thanh toán sẽ tự cập nhật khi SePay báo giao dịch thành công.</p>
              <p>Mã QR có hiệu lực 15 phút; hết hạn thì lịch vẫn chờ khách nhận và nhân viên có thể tạo mã mới.</p>
              <div className="space-y-2 border-t border-border-subtle pt-2 text-left text-muted-text">
                <p>Nếu webhook chưa cập nhật, kiểm tra tiền vào trên SePay rồi xác nhận tại đây.</p>
                <Button
                  type="button"
                  disabled={isPaying}
                  onClick={actions.onConfirmBankTransfer}
                  className="h-10 w-full text-sm font-semibold"
                >
                  {isPaying ? "Đang xác nhận..." : "Xác nhận đã nhận tiền"}
                </Button>
              </div>
            </div>
          )}
          {qrPaymentIntent?.expired && (
            <div role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
              <p className="font-bold">Mã QR đã hết hạn sau 15 phút.</p>
              <p>Lịch vẫn chờ khách nhận và chưa ghi nhận đã thanh toán. Nếu khách đã chuyển theo mã cũ, hãy liên hệ hỗ trợ trước khi tạo mã mới.</p>
            </div>
          )}
          {qrPaymentIntent?.status === "REVIEW" && (
            <div role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
              <p className="font-bold">Giao dịch cần hỗ trợ đối chiếu.</p>
              <p>Tạm dừng thu thêm tiền cho đến khi được xử lý.</p>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border-subtle bg-surface p-3.5 text-left text-sm text-muted-text">
            {sepayAccount?.configured ? (
              <>
                <div className="flex items-center justify-between py-0.5">
                  <span>Ngân hàng:</span>
                  <strong className="text-ink">{sepayAccount.bankName}</strong>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span>Chủ tài khoản:</span>
                  <strong className="text-ink">{sepayAccount.accountName}</strong>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span>Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="font-bold tabular-nums text-ink">{sepayAccount.accountNumber}</strong>
                    <Button
                      type="button"
                      onClick={actions.onCopyAccount}
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded text-primary hover:bg-slate-100"
                      aria-label={copiedField === "account" ? "Đã sao chép số tài khoản" : "Sao chép số tài khoản"}
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === "account" ? (
                        <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy aria-hidden="true" className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p role="alert" className="text-amber-800">Tài khoản VietQR chưa được cấu hình. Có thể chọn thu tiền mặt.</p>
            )}
            <div className="flex items-center justify-between border-t border-border-subtle py-0.5 pt-1.5">
              <span>Nội dung CK:</span>
              <div className="flex items-center gap-1.5">
                <strong className="font-bold text-primary">
                  {qrPaymentIntent?.status === "PENDING" ? qrPaymentIntent.transferInfo : selectedBooking.code}
                </strong>
                <Button
                  type="button"
                  onClick={actions.onCopyTransferInfo}
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded text-primary hover:bg-slate-100"
                  aria-label={copiedField === "code" ? "Đã sao chép nội dung chuyển khoản" : "Sao chép nội dung chuyển khoản"}
                  title="Sao chép mã phiếu"
                >
                  {copiedField === "code" ? (
                    <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border-subtle py-0.5 pt-1.5">
              <span>Số tiền cần thu:</span>
              <strong className="text-sm font-bold tabular-nums text-primary">
                {(qrPaymentIntent?.status === "PENDING" ? qrPaymentIntent.amount : effectiveRemaining).toLocaleString("vi-VN")}₫
              </strong>
            </div>
          </div>

          {!qrPaymentIntent || qrPaymentIntent.status === "CANCELLED" ? (
            <>
              <Button
                type="button"
                disabled={
                  isPaying ||
                  !sepayAccount?.configured ||
                  selectedBooking.financial.paymentStatus === "PAID" ||
                  selectedBooking.status !== "READY_FOR_PICKUP" ||
                  effectiveRemaining <= 0
                }
                onClick={actions.onCreateQrIntent}
                className="h-10 w-full rounded-lg text-sm font-semibold"
              >
                {isPaying ? "Đang tạo mã..." : sepayAccountLoading ? "Đang tải cấu hình QR..." : sepayAccount?.configured ? qrPaymentIntent?.expired ? "Tạo mã QR mới" : "Tạo mã QR thanh toán" : "QR chưa được cấu hình"}
              </Button>
              {selectedBooking.status !== "READY_FOR_PICKUP" &&
                selectedBooking.financial.paymentStatus !== "PAID" &&
                effectiveRemaining > 0 &&
                sepayAccount?.configured && (
                  <p className="text-center text-xs text-muted-text">
                    Có thể tạo mã khi lịch chuyển sang “Chờ khách nhận”.
                  </p>
                )}
            </>
          ) : qrPaymentIntent.status === "PENDING" ? (
            <Button
              type="button"
              disabled={isPaying}
              onClick={actions.onCancelQrIntent}
              variant="outline"
              className="h-10 w-full rounded-lg border-border-subtle bg-surface text-sm font-semibold text-ink"
            >
              {isPaying ? "Đang xử lý..." : "Hủy mã QR"}
            </Button>
          ) : null}
        </div>
      )}
    </>
  );
}
