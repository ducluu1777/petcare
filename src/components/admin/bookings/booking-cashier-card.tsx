"use client";

import { Banknote, Check, CheckCircle2, Loader2, Printer, QrCode, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingCashierQrSection } from "@/components/admin/bookings/booking-cashier-qr-section";
import type { BookingCashierCardProps } from "@/components/admin/bookings/booking-cashier-card.types";

export function BookingCashierCard({ state, actions }: BookingCashierCardProps) {
  const {
    selectedBooking,
    cashierMethod,
    cashGiven,
    isPaidSuccess,
    isPaying,
    cashierVoucherCode,
    cashierVoucherDiscount,
    cashierVoucherError,
    isValidatingVoucher,
    spaPromotionActive,
    spaPromotionEligible,
    spaPromotionDiscount,
    effectiveRemaining,
    pointsToEarn,
    qrPaymentIntent,
  } = state;
  const {
    setCashierMethod,
    setCashGiven,
    setCashierVoucherCode,
    setCashierVoucherError,
    setCashierVoucherDiscount,
    onApplyVoucher,
    onConfirmPayment,
    onCompleteHandover,
    onPrintReceipt,
  } = actions;

  return (
                  <div className="bg-surface rounded-xl p-5 border border-border-subtle shadow-xs space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap text-sm font-semibold text-slate-700">Nhận tiền bằng</span>
                    </div>

                    {/* Bộ 2 nút chọn phương thức thu: Chỉ VietQR và Tiền mặt */}
                    <div role="group" aria-label="Chọn phương thức thanh toán" className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        aria-pressed={cashierMethod === "VIETQR"}
                        onClick={() => setCashierMethod("VIETQR")}
                        variant="outline"
                        className={`h-auto w-full flex-col gap-1.5 rounded-lg p-2.5 text-sm font-semibold transition-all ${
                          cashierMethod === "VIETQR"
                            ? "border-primary bg-teal-50 text-primary shadow-xs"
                            : "border-border-subtle bg-slate-50 text-muted-text hover:text-ink"
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Mã VietQR</span>
                      </Button>

                      <Button
                        type="button"
                        aria-pressed={cashierMethod === "CASH"}
                        disabled={qrPaymentIntent?.status === "PENDING" || qrPaymentIntent?.status === "REVIEW"}
                        onClick={() => setCashierMethod("CASH")}
                        variant="outline"
                        className={`h-auto w-full flex-col gap-1.5 rounded-lg p-2.5 text-sm font-semibold transition-all ${
                          cashierMethod === "CASH"
                            ? "border-primary bg-teal-50 text-primary shadow-xs"
                            : "border-border-subtle bg-slate-50 text-muted-text hover:text-ink"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Tiền mặt</span>
                      </Button>
                    </div>

                    {/* ÁP DỤNG MÃ VOUCHER & ĐIỂM TÍCH LŨY KHI THANH TOÁN DỊCH VỤ */}
                    {!isPaidSuccess && selectedBooking.financial.serviceRemainingAmount > 0 && (
                      <div className="space-y-3">
                        {spaPromotionEligible && spaPromotionActive && (
                          <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-950">
                            <div className="flex items-center justify-between gap-3 font-bold">
                              <span>Ưu đãi đặt lịch Spa</span>
                              <span className="tabular-nums">
                                {cashierVoucherDiscount > 0
                                  ? "Đang dùng voucher"
                                  : `-${spaPromotionDiscount.toLocaleString("vi-VN")}₫`}
                              </span>
                            </div>
                            <p>
                              Giảm 5% trên hóa đơn, kiểm tra da và tai miễn phí, tặng một gói hạt phù hợp.
                            </p>
                            {cashierVoucherDiscount > 0 ? (
                              <p className="font-semibold">Voucher thay cho mức giảm 5%; không cộng dồn.</p>
                            ) : (
                              <p className="font-semibold">Mức giảm 5% đang tự áp dụng. Nhập voucher nếu khách muốn dùng voucher thay thế.</p>
                            )}
                          </div>
                        )}
                        {/* 1. Áp mã Voucher do nhân viên thao tác */}
                        <div className="border border-border-subtle bg-slate-50/80 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                              <Tag className="w-3.5 h-3.5 text-primary" />
                              <span>Mã voucher</span>
                            </div>
                            {cashierVoucherDiscount > 0 && (
                              <span className="text-xs text-emerald-600 font-bold">
                                -{cashierVoucherDiscount.toLocaleString("vi-VN")}₫
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={cashierVoucherCode}
                              disabled={!!qrPaymentIntent && qrPaymentIntent.status !== "CANCELLED"}
                              onChange={(e) => {
                                setCashierVoucherCode(e.target.value.toUpperCase());
                                setCashierVoucherDiscount(0);
                                setCashierVoucherError(null);
                              }}
                              placeholder="Nhập mã voucher"
                              className="flex-1 text-sm font-semibold uppercase"
                            />
                            <Button
                              type="button"
                              disabled={!cashierVoucherCode.trim() || isValidatingVoucher || (!!qrPaymentIntent && qrPaymentIntent.status !== "CANCELLED")}
                              onClick={onApplyVoucher}
                              className="h-10 rounded-lg px-3 text-sm font-semibold"
                            >
                              {isValidatingVoucher ? "..." : "Áp dụng"}
                            </Button>
                            {cashierVoucherDiscount > 0 && (
                              <Button
                                type="button"
                                disabled={!!qrPaymentIntent && qrPaymentIntent.status !== "CANCELLED"}
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCashierVoucherCode("");
                                  setCashierVoucherDiscount(0);
                                }}
                                className="size-10 rounded-lg text-slate-400 hover:text-slate-600"
                                aria-label="Gỡ mã voucher đã áp dụng"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {cashierVoucherError && (
                            <p className="text-xs text-rose-600 font-medium">{cashierVoucherError}</p>
                          )}
                          <p className="text-xs text-muted-text">
                            Voucher đổi bằng điểm có thể được áp dụng bằng mã voucher.
                          </p>
                        </div>
                      </div>
                    )}

                    <BookingCashierQrSection state={state} actions={actions} />

                    {/* 2. HIỂN THỊ TIỀN MẶT VÀ TÍNH TIỀN THỪA */}
                    {cashierMethod === "CASH" && !isPaidSuccess && selectedBooking.financial.paymentStatus !== "PAID" && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-border-subtle space-y-3 text-sm">
                        <div>
                          <label htmlFor="cash-received-amount" className="mb-1 block font-semibold text-slate-700">Số tiền khách đưa</label>
                          <div className="relative">
                            <Input 
                              id="cash-received-amount"
                              type="number"
                              min={effectiveRemaining}
                              value={cashGiven}
                              onChange={(e) => setCashGiven(e.target.value)}
                              className="w-full pr-8 font-bold tabular-nums"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text">₫</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-2.5 bg-surface rounded-lg border border-border-subtle">
                          <span className="text-slate-600">Tiền thừa trả khách:</span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {Math.max(0, (parseInt(cashGiven) || 0) - effectiveRemaining).toLocaleString("vi-VN")} ₫
                          </span>
                        </div>
                      </div>
                    )}

                    {cashierMethod === "CASH" && !isPaidSuccess && selectedBooking.financial.paymentStatus !== "PAID" && (Number(cashGiven) || 0) < effectiveRemaining && (
                      <p role="alert" className="text-xs font-medium text-rose-700">
                        Số tiền nhận chưa đủ. Còn thiếu {(effectiveRemaining - (Number(cashGiven) || 0)).toLocaleString("vi-VN")}₫.
                      </p>
                    )}

                    {!isPaidSuccess && pointsToEarn > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                        Thanh toán sẽ cộng <strong>{pointsToEarn.toLocaleString("vi-VN")}</strong> điểm tích lũy cho khách
                      </p>
                    )}

                    {/* NÚT XÁC NHẬN CHỐT HOÁ ĐƠN */}
                    {isPaidSuccess ? (
                      <div className="space-y-2">
                        <div className="w-full bg-emerald-50 text-emerald-800 border border-emerald-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Đã thu đủ tiền và bàn giao</span>
                        </div>
                        <Button
                          type="button"
                          onClick={onPrintReceipt}
                          variant="outline"
                          className="h-10 w-full gap-2 rounded-xl border-border-subtle bg-surface text-sm font-semibold text-ink shadow-xs hover:bg-slate-100"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                          <span>In hóa đơn</span>
                        </Button>
                      </div>
                    ) : selectedBooking.financial.paymentStatus === "PAID" ? (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          disabled={isPaying || selectedBooking.status !== "READY_FOR_PICKUP"}
                          onClick={onCompleteHandover}
                          className="h-12 w-full gap-2 rounded-xl text-sm font-semibold shadow-xs"
                        >
                          {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          <span>{isPaying ? "Đang xử lý..." : "Xác nhận đã bàn giao & hoàn tất"}</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={onPrintReceipt}
                          variant="outline"
                          className="h-10 w-full gap-2 rounded-xl border-border-subtle bg-surface text-sm font-semibold text-ink shadow-xs hover:bg-slate-100"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                          <span>In hóa đơn</span>
                        </Button>
                      </div>
                    ) : cashierMethod === "CASH" ? (
                      <Button
                        type="button"
                        disabled={
                          isPaying ||
                          selectedBooking.status !== "READY_FOR_PICKUP" ||
                          qrPaymentIntent?.status === "REVIEW" ||
                          (cashierMethod === "CASH" && (Number(cashGiven) || 0) < effectiveRemaining)
                        }
                        onClick={onConfirmPayment}
                        className="h-12 w-full gap-2 rounded-xl text-sm font-semibold shadow-xs"
                      >
                        {isPaying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{isPaying ? "Đang xử lý..." : selectedBooking.status !== "READY_FOR_PICKUP" ? "Chờ hoàn tất dịch vụ để thu tiền" : qrPaymentIntent?.status === "REVIEW" ? "Tạm dừng để đối soát khoản chuyển" : `Ghi nhận tiền mặt ${effectiveRemaining.toLocaleString("vi-VN")}₫`}</span>
                      </Button>
                    ) : null}
                  </div>
  );
}
