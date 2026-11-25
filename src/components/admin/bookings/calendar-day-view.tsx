"use client";

import type { BookingRecord } from "@/lib/admin-booking-record";
import { Button } from "@/components/ui/button";
import type { CalendarStatusPresentation } from "@/components/admin/bookings/calendar-month-day-cell";

interface CalendarDayViewProps {
	selectedDateFormatted: string;
	dayBookings: BookingRecord[];
	arrivalBookings: BookingRecord[];
	inServiceBookings: BookingRecord[];
	completedBookings: BookingRecord[];
	getStatusPresentation: (
		status: BookingRecord["status"],
	) => CalendarStatusPresentation;
	onOpenDetail: (booking: BookingRecord) => void;
}

export function CalendarDayView({
	selectedDateFormatted,
	dayBookings,
	arrivalBookings,
	inServiceBookings,
	completedBookings,
	getStatusPresentation,
	onOpenDetail,
}: CalendarDayViewProps) {
	return (
		<div className="flex min-w-0 flex-col bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
			<div className="p-2.5 bg-slate-50 border-b border-border-subtle text-xs font-semibold text-slate-600 flex justify-between items-center shrink-0">
				<span>Lịch ngày {selectedDateFormatted}</span>
				<span className="text-primary font-bold">
					{dayBookings.length} ca phục vụ
				</span>
			</div>

			<div className="grid auto-rows-[360px] grid-cols-1 divide-y divide-border-subtle md:auto-rows-[480px] md:grid-cols-3 md:divide-y-0 md:divide-x">
				{/* Lịch đã đặt hoặc đã tiếp nhận */}
				<div className="flex flex-col h-full min-h-0 overflow-hidden p-3">
					<div className="p-2 rounded-lg bg-teal-50 border border-teal-200 shrink-0">
						<h4 className="font-bold text-ink text-xs">Đã đặt / Đã tiếp nhận</h4>
					</div>

					<div
						data-lenis-prevent
						className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 mt-2 pr-1 scrollbar-thin"
					>
						{arrivalBookings.length === 0 ? (
							<p className="py-4 text-center text-xs text-muted-text">
								Không có lịch ở bước này.
							</p>
						) : (
							arrivalBookings.map((b) => (
								<Button
									key={b.id}
									type="button"
									variant="ghost"
									onClick={() => onOpenDetail(b)}
									aria-label={`Mở lịch ${b.code} của ${b.pet.name}, trạng thái ${getStatusPresentation(b.status).label}`}
									className="h-auto w-full justify-start p-2.5 rounded-xl border border-border-subtle bg-slate-50 hover:bg-slate-100 text-left shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								>
									<div className="flex justify-between items-center text-xs mb-0.5">
										<span className="font-bold text-ink">
											{b.service.timeRange ||
												b.service.scheduledTime.split(" ")[0]}
										</span>
										<span className="text-xs text-primary font-bold">
											{b.code}
										</span>
									</div>
									<p className="font-bold text-xs text-ink">
										{b.pet.name} ({b.pet.breed})
									</p>
									<p className="text-xs text-muted-text mt-0.5">
										{b.service.title}
									</p>
									<span className="mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold">
										{getStatusPresentation(b.status).label}
									</span>
								</Button>
							))
						)}
					</div>
				</div>

				{/* Đang làm */}
				<div className="flex flex-col h-full min-h-0 overflow-hidden p-3">
					<div className="p-2 rounded-lg bg-teal-50 border border-teal-200 shrink-0">
						<h4 className="font-bold text-ink text-xs">Đang chăm sóc</h4>
					</div>

					<div
						data-lenis-prevent
						className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 mt-2 pr-1 scrollbar-thin"
					>
						{inServiceBookings.length === 0 ? (
							<p className="py-4 text-center text-xs text-muted-text">
								Không có lịch ở bước này.
							</p>
						) : (
							inServiceBookings.map((b) => (
								<Button
									key={b.id}
									type="button"
									variant="ghost"
									onClick={() => onOpenDetail(b)}
									aria-label={`Mở lịch ${b.code} của ${b.pet.name}, trạng thái ${getStatusPresentation(b.status).label}`}
									className={`h-auto w-full justify-start p-2.5 rounded-xl border text-left shadow-xs transition-all hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getStatusPresentation(b.status).bg}`}
								>
									<div className="flex justify-between items-center text-xs mb-0.5">
										<span className="font-bold text-primary">
											{b.service.timeRange ||
												b.service.scheduledTime.split(" ")[0]}
										</span>
										<span className="text-xs text-primary font-bold">
											{b.code}
										</span>
									</div>
									<p className="font-bold text-xs text-ink">
										{b.pet.name} ({b.pet.breed})
									</p>
									<p className="text-xs text-muted-text mt-0.5">
										{b.service.title}
									</p>
									<div className="mt-1.5 text-xs font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded inline-block">
										{getStatusPresentation(b.status).label}
									</div>
								</Button>
							))
						)}
					</div>
				</div>

				{/* Chờ đón hoặc đã khép lại */}
				<div className="flex flex-col h-full min-h-0 overflow-hidden p-3">
					<div className="p-2 rounded-lg bg-teal-50 border border-teal-200 shrink-0">
						<h4 className="font-bold text-ink text-xs">
							Chờ khách nhận / đã kết thúc
						</h4>
					</div>

					<div
						data-lenis-prevent
						className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 mt-2 pr-1 scrollbar-thin"
					>
						{completedBookings.length === 0 ? (
							<p className="py-4 text-center text-xs text-muted-text">
								Không có lịch ở bước này.
							</p>
						) : (
							completedBookings.map((b) => (
								<Button
									key={b.id}
									type="button"
									variant="ghost"
									onClick={() => onOpenDetail(b)}
									aria-label={`Mở lịch ${b.code} của ${b.pet.name}, trạng thái ${getStatusPresentation(b.status).label}`}
									className={`h-auto w-full justify-start p-2.5 rounded-xl border text-left shadow-xs transition-all hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getStatusPresentation(b.status).bg}`}
								>
									<div className="flex justify-between items-center text-xs mb-0.5">
										<span className="font-bold text-slate-700">
											{b.service.timeRange ||
												b.service.scheduledTime.split(" ")[0]}
										</span>
										<span className="text-xs text-slate-700 font-bold">
											{b.code}
										</span>
									</div>
									<p className="font-bold text-xs text-ink">
										{b.pet.name} ({b.pet.breed})
									</p>
									<p className="text-xs text-muted-text mt-0.5">
										{b.service.title}
									</p>
									<div className="mt-1.5 inline-block rounded-md border border-current/20 bg-surface/70 px-2 py-0.5 text-xs font-bold">
										{getStatusPresentation(b.status).label}
									</div>
								</Button>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
