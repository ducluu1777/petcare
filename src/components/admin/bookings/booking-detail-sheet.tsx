"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BookingDetailHeader } from "@/components/admin/bookings/booking-detail-header";
import { BookingPetProfileCard } from "@/components/admin/bookings/booking-pet-profile-card";
import { BookingCustomerInfoCard } from "@/components/admin/bookings/booking-customer-info-card";
import { BookingProgressCard } from "@/components/admin/bookings/booking-progress-card";
import { BookingInvoiceSummaryCard } from "@/components/admin/bookings/booking-invoice-summary-card";
import { BookingStaffAssignmentCard } from "@/components/admin/bookings/booking-staff-assignment-card";
import { BookingAddonsCard } from "@/components/admin/bookings/booking-addons-card";
import { BookingCashierCard } from "@/components/admin/bookings/booking-cashier-card";
import { BookingPaymentReceiptPrint } from "@/components/admin/bookings/booking-payment-receipt-print";
import { BookingStatusBadge } from "@/components/admin/bookings/booking-status-badge";
import type { ServiceItem } from "@/hooks/use-services";
import { useUserDetail, type UserListItem } from "@/hooks/use-users";
import type { BookingRecord } from "@/lib/admin-booking-record";
import { getBookingCancellationReason } from "@/lib/booking-cancellation-presentation";
import { getDisplayLabel } from "@/lib/domain-labels";

type BookingNextAction = NonNullable<
	React.ComponentProps<typeof BookingProgressCard>["nextAction"]
>;
type BookingStatusV2Action = BookingNextAction["target"];
type BehavioralFlag = NonNullable<BookingRecord["pet"]["behavioralFlag"]>;

interface BookingDetailSheetState {
	open: boolean;
	booking: BookingRecord | null;
	editWeightVal: string;
	isSavingWeight: boolean;
	isSavingBehavior: boolean;
	staffMembers: UserListItem[];
	isAssignStaffOpen: boolean;
	targetStaffId: string;
	isAssigningStaff: boolean;
	nextBookingAction: BookingNextAction | null;
	isUpdatingStatus: boolean;
	canMarkNoShow: boolean;
	noShowEligibleAt: number | null;
	addonServices: ServiceItem[];
	isAddonPanelOpen: boolean;
	isUpdatingAddons: boolean;
	cashierVoucherCode: string;
	cashierVoucherDiscount: number;
	isPaidSuccess: boolean;
	effectiveRemaining: number;
	cashierCardState:
		| React.ComponentProps<typeof BookingCashierCard>["state"]
		| null;
	cashierCardActions: React.ComponentProps<
		typeof BookingCashierCard
	>["actions"];
}

interface BookingDetailSheetActions {
	onOpenChange: (open: boolean) => void;
	onPrint: (booking: BookingRecord) => void;
	onOpenChat: (booking: BookingRecord) => void;
	onWeightValueChange: (value: string) => void;
	onSaveWeight: () => void;
	onBehaviorChange: (flag: BehavioralFlag) => void;
	onToggleStaffAssignment: () => void;
	onStaffChange: (staffId: string) => void;
	onCancelStaffAssignment: () => void;
	onAssignStaff: () => void;
	onAdvance: (status: BookingStatusV2Action) => void;
	onOpenNoShow: () => void;
	onToggleAddons: () => void;
	onAddAddon: (serviceId: string) => void;
	onRemoveAddon: (itemId: string) => void;
}

interface BookingDetailSheetProps {
	state: BookingDetailSheetState;
	actions: BookingDetailSheetActions;
}

export function BookingDetailSheet({
	state,
	actions,
}: BookingDetailSheetProps) {
	const {
		open: isSheetOpen,
		booking: selectedBooking,
		editWeightVal,
		isSavingWeight,
		isSavingBehavior,
		staffMembers,
		isAssignStaffOpen,
		targetStaffId,
		isAssigningStaff,
		nextBookingAction,
		isUpdatingStatus,
		canMarkNoShow,
		noShowEligibleAt,
		addonServices,
		isAddonPanelOpen,
		isUpdatingAddons,
		cashierVoucherCode,
		cashierVoucherDiscount,
		isPaidSuccess,
		effectiveRemaining,
		cashierCardState,
		cashierCardActions,
	} = state;
	const {
		onOpenChange,
		onPrint,
		onOpenChat,
		onWeightValueChange,
		onSaveWeight,
		onBehaviorChange,
		onToggleStaffAssignment,
		onStaffChange,
		onCancelStaffAssignment,
		onAssignStaff,
		onAdvance,
		onOpenNoShow,
		onToggleAddons,
		onAddAddon,
		onRemoveAddon,
	} = actions;
	const cancellationActorId = selectedBooking?.status === "CANCELLED"
		? selectedBooking.cancelledById ?? undefined
		: undefined;
	const { data: cancellationActor } = useUserDetail(cancellationActorId);
	const cancellationActorLabel = selectedBooking?.cancelledById === null
		? `Khách hàng · ${selectedBooking.customer.name}`
		: selectedBooking?.cancelledById
			? cancellationActor
				? `${getDisplayLabel("userRole", cancellationActor.role)} · ${cancellationActor.name}`
				: "Nhân viên cửa hàng"
			: "Chưa ghi nhận";

	return (
		<Sheet open={isSheetOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				data-lenis-prevent
				className="w-[95vw] sm:w-[92vw] md:w-[90vw] lg:w-[1150px] xl:w-[1250px] max-w-[95vw] bg-slate-50 border-l border-border-subtle p-0 flex flex-col h-dvh max-h-dvh shadow-2xl z-50 text-ink overscroll-contain"
			>
				{selectedBooking && (
					<>
						{selectedBooking.status === "CANCELLED" ? (
							<>
								<SheetHeader className="shrink-0 border-b border-border-subtle bg-surface p-5 sm:p-6">
									<div className="flex flex-wrap items-center gap-2">
										<p className="text-xs font-semibold text-muted-text">Mã lịch {selectedBooking.code}</p>
										<BookingStatusBadge status="CANCELLED" />
									</div>
									<SheetTitle className="text-lg font-bold text-ink">Thông tin lịch đã hủy</SheetTitle>
									<SheetDescription>Lịch vẫn được lưu để tra cứu; các thao tác xử lý đã đóng.</SheetDescription>
								</SheetHeader>
								<div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain scrollbar-thin">
									<div className="mx-auto w-full max-w-4xl space-y-4">
										<div className="grid gap-4 sm:grid-cols-2">
											<section aria-labelledby="cancelled-booking-customer" className="min-w-0 rounded-xl border border-border-subtle bg-surface p-4">
												<h3 id="cancelled-booking-customer" className="text-sm font-semibold text-slate-600">Khách hàng</h3>
												<p className="mt-2 break-words font-bold text-ink">{selectedBooking.customer.name}</p>
												{selectedBooking.customer.phone ? (
													<a href={`tel:${selectedBooking.customer.phone}`} className="mt-1 inline-block min-h-10 max-w-full break-all py-2 text-sm font-semibold text-primary underline-offset-2 hover:underline">
														{selectedBooking.customer.phone}
													</a>
												) : <p className="mt-1 text-sm text-muted-text">Chưa có số điện thoại</p>}
											</section>
											<section aria-labelledby="cancelled-booking-pet" className="min-w-0 rounded-xl border border-border-subtle bg-surface p-4">
												<h3 id="cancelled-booking-pet" className="text-sm font-semibold text-slate-600">Thú cưng</h3>
												<p className="mt-2 break-words font-bold text-ink">{selectedBooking.pet.name}</p>
												<p className="mt-1 break-words text-sm text-muted-text">{selectedBooking.pet.species} · {selectedBooking.pet.breed}</p>
												<p className="mt-1 text-sm text-muted-text">Cân nặng: {selectedBooking.pet.weight == null ? "Chưa cập nhật" : `${selectedBooking.pet.weight} kg`} · {selectedBooking.pet.age}</p>
											</section>
										</div>

										<section aria-labelledby="cancelled-booking-appointment" className="rounded-xl border border-border-subtle bg-surface p-4">
											<h3 id="cancelled-booking-appointment" className="text-sm font-semibold text-slate-600">Lịch hẹn</h3>
											<dl className="mt-3 grid gap-3 sm:grid-cols-2">
												<div className="min-w-0">
													<dt className="text-xs text-muted-text">Ngày và giờ</dt>
													<dd className="mt-1 break-words text-sm font-semibold text-ink">{selectedBooking.service.scheduledTime || "Chưa có thời gian"}</dd>
												</div>
												<div className="min-w-0">
													<dt className="text-xs text-muted-text">Loại lịch</dt>
													<dd className="mt-1 break-words text-sm font-semibold text-ink">{selectedBooking.service.category}</dd>
												</div>
											</dl>
										</section>

										<section aria-labelledby="cancelled-booking-services" className="rounded-xl border border-border-subtle bg-surface p-4">
											<h3 id="cancelled-booking-services" className="text-sm font-semibold text-slate-600">Dịch vụ</h3>
											<div className="mt-3 space-y-2">
												{selectedBooking.service.items.length > 0 ? selectedBooking.service.items.map((item) => (
													<div key={item.id} className="flex min-w-0 items-start justify-between gap-3 border-t border-border-subtle pt-2 first:border-0 first:pt-0">
														<span className="min-w-0 break-words text-sm text-ink">{item.name}{item.isAddon ? " · Dịch vụ bổ sung" : ""}</span>
														<span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{item.price.toLocaleString("vi-VN")}₫</span>
													</div>
												)) : <p className="text-sm text-ink">{selectedBooking.service.title}</p>}
											</div>
										</section>

										<section aria-labelledby="cancelled-booking-payment" className="rounded-xl border border-border-subtle bg-surface p-4">
											<h3 id="cancelled-booking-payment" className="text-sm font-semibold text-slate-600">Giá dịch vụ và thanh toán</h3>
											<dl className="mt-3 space-y-2 text-sm">
												<div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-muted-text">Tạm tính</dt><dd className="font-medium tabular-nums text-ink">{selectedBooking.financial.subtotal.toLocaleString("vi-VN")}₫</dd></div>
												{selectedBooking.financial.discount > 0 && <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-muted-text">Ưu đãi</dt><dd className="font-medium tabular-nums text-ink">−{selectedBooking.financial.discount.toLocaleString("vi-VN")}₫</dd></div>}
												<div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-border-subtle pt-2 font-bold"><dt className="text-ink">Tổng giá trị lịch</dt><dd className="tabular-nums text-ink">{selectedBooking.financial.finalAmount.toLocaleString("vi-VN")}₫</dd></div>
												{selectedBooking.latePickupFeeAmount > 0 && <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-muted-text">Phí chăm giữ</dt><dd className="font-medium tabular-nums text-ink">{selectedBooking.latePickupFeeAmount.toLocaleString("vi-VN")}₫ · {selectedBooking.latePickupFeePaid ? "đã thu" : "chưa thu"}</dd></div>}
												<p className="pt-1 text-xs text-muted-text">
													{selectedBooking.financial.serviceRemainingAmount === 0
														? `Dịch vụ đã thanh toán${selectedBooking.financial.paidMethod ? ` · ${selectedBooking.financial.paidMethod}` : ""} trước khi hủy.`
														: "Dịch vụ chưa thanh toán trước khi hủy."} Lịch đã hủy; không còn khoản cần thu.
												</p>
											</dl>
										</section>

										<section aria-labelledby="cancelled-booking-audit" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
											<h3 id="cancelled-booking-audit" className="text-sm font-semibold text-rose-800">Thông tin hủy</h3>
											<dl className="mt-3 grid gap-3 sm:grid-cols-2">
												<div className="min-w-0">
													<dt className="text-xs text-rose-700">Người hủy</dt>
													<dd className="mt-1 break-words text-sm font-semibold text-rose-950">{cancellationActorLabel}</dd>
												</div>
												<div className="min-w-0">
													<dt className="text-xs text-rose-700">{selectedBooking.cancellationTimeSource === "LAST_UPDATED" ? "Lần cập nhật cuối (ước tính lúc hủy)" : "Thời điểm hủy"}</dt>
													<dd className="mt-1 break-words text-sm font-semibold text-rose-950">{selectedBooking.cancelledAt ? new Date(selectedBooking.cancelledAt).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa ghi nhận"}</dd>
												</div>
												<div className="min-w-0 sm:col-span-2">
													<dt className="text-xs text-rose-700">Lý do</dt>
													<dd className="mt-1 break-words text-sm font-semibold text-rose-950">{getBookingCancellationReason(selectedBooking.cancellationReason)}</dd>
												</div>
											</dl>
										</section>
										{selectedBooking.parentNotes && (
											<section aria-label="Ghi chú của lịch" className="rounded-xl border border-border-subtle bg-surface p-4">
												<h3 className="text-sm font-semibold text-slate-600">Ghi chú</h3>
												<p className="mt-2 break-words text-sm text-ink">{selectedBooking.parentNotes}</p>
											</section>
										)}
									</div>
								</div>
							</>
						) : (
							<>
						<BookingDetailHeader
							booking={selectedBooking}
							onPrint={() => onPrint(selectedBooking)}
							onOpenChat={() => onOpenChat(selectedBooking)}
						/>

						{/* THÂN DRAWER: VÙNG CUỘN ĐỘC LẬP CHỨA KIẾN TRÚC 2 CỘT */}
						<div
							data-lenis-prevent
							className="flex-1 min-h-0 overflow-y-auto p-6 overscroll-contain scrollbar-thin"
						>
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
								{/* ================= CỘT TRÁI (60% WIDTH - 7 COLS): THÔNG TIN THÚ CƯNG, TIẾN ĐỘ THỰC HIỆN ================= */}
								<div className="lg:col-span-7 space-y-5">
									<BookingPetProfileCard
										booking={selectedBooking}
										weightValue={editWeightVal}
						isSavingWeight={isSavingWeight || isUpdatingStatus}
										isSavingBehavior={isSavingBehavior}
										onWeightValueChange={onWeightValueChange}
										onSaveWeight={onSaveWeight}
										onBehaviorChange={onBehaviorChange}
									/>

									<BookingCustomerInfoCard booking={selectedBooking} />

									<BookingStaffAssignmentCard
										booking={selectedBooking}
										staffMembers={staffMembers}
										isOpen={isAssignStaffOpen}
										selectedStaffId={targetStaffId}
										isSaving={isAssigningStaff}
										onToggle={onToggleStaffAssignment}
										onStaffChange={onStaffChange}
										onCancel={onCancelStaffAssignment}
										onAssign={onAssignStaff}
									/>

									<BookingProgressCard
										booking={selectedBooking}
										nextAction={nextBookingAction}
										isUpdating={isUpdatingStatus}
										canMarkNoShow={canMarkNoShow}
										noShowEligibleAt={noShowEligibleAt}
										onAdvance={onAdvance}
										onOpenNoShow={onOpenNoShow}
									/>

									<BookingAddonsCard
										booking={selectedBooking}
										addonServices={addonServices ?? []}
										isOpen={isAddonPanelOpen}
										isUpdating={isUpdatingAddons}
										onToggle={onToggleAddons}
										onAdd={onAddAddon}
										onRemove={onRemoveAddon}
									/>

								</div>

								{/* ================= CỘT PHẢI (40% WIDTH - 5 COLS): BẢNG KÊ THU NGÂN & THANH TOÁN ================= */}
								<div className="lg:col-span-5 space-y-5 sticky top-0">
									<BookingInvoiceSummaryCard
										booking={selectedBooking}
										voucherCode={cashierVoucherCode}
										voucherDiscount={cashierVoucherDiscount}
										isPaid={isPaidSuccess}
										remainingAmount={effectiveRemaining}
									/>

									{cashierCardState && (
										<BookingCashierCard
											state={cashierCardState}
											actions={cashierCardActions}
										/>
									)}
								</div>
							</div>
						</div>
						{selectedBooking.financial.paymentStatus === "PAID" && (
							<BookingPaymentReceiptPrint booking={selectedBooking} />
						)}
							</>
						)}
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
