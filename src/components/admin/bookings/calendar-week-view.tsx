"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingRecord } from "@/lib/admin-booking-record";
import type { CalendarStatusPresentation } from "@/components/admin/bookings/calendar-month-day-cell";

export interface CalendarWeekDay {
	title: string;
	dateString: string;
	isToday: boolean;
}

interface CalendarWeekViewProps {
	weekDays: CalendarWeekDay[];
	bookingsByDate: ReadonlyMap<string, BookingRecord[]>;
	closedDateSet: ReadonlySet<string>;
	showClosedDates: boolean;
	getStatusPresentation: (
		status: BookingRecord["status"],
	) => CalendarStatusPresentation;
	onOpenDetail: (booking: BookingRecord) => void;
}

export function CalendarWeekView({
	weekDays,
	bookingsByDate,
	closedDateSet,
	showClosedDates,
	getStatusPresentation,
	onOpenDetail,
}: CalendarWeekViewProps) {
	return (
		<div className="flex h-[clamp(420px,65dvh,720px)] min-h-0 flex-col bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
			<div className="p-2.5 bg-slate-50 border-b border-border-subtle text-xs font-semibold text-slate-600 flex justify-between items-center shrink-0">
				<span>Lịch theo tuần</span>
				<span className="text-primary font-bold">
					{weekDays.reduce(
						(sum, day) =>
							sum + (bookingsByDate.get(day.dateString)?.length ?? 0),
						0,
					)}{" "}
					lịch
				</span>
			</div>

			<div
				role="region"
				aria-label="Lịch hẹn theo tuần; cuộn ngang để xem đủ bảy ngày"
				tabIndex={0}
				className="flex-1 min-h-0 overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
			>
				<div className="grid h-full min-w-[840px] grid-cols-7 divide-x divide-border-subtle text-xs">
					{weekDays.map((col) => {
						const list = bookingsByDate.get(col.dateString) || [];
						const isTodayCol = col.isToday;
						const isClosed = closedDateSet.has(col.dateString);

						return (
							<div
								key={col.title}
								className={`flex flex-col h-full min-h-0 overflow-hidden ${isTodayCol ? "bg-teal-50/20" : "bg-surface"}`}
							>
								<div
									className={`px-1 py-1.5 text-center border-b border-border-subtle text-xs shrink-0 ${isTodayCol ? "text-primary font-black" : "text-slate-700"}`}
								>
									<p className="font-bold">{col.title}</p>
									{showClosedDates && isClosed && (
										<p className="mt-0.5 text-xs font-semibold text-amber-800">
											Cơ sở nghỉ
										</p>
									)}
								</div>

								<div
									data-lenis-prevent
									className="flex-1 min-h-0 p-2 space-y-1.5 overflow-y-auto overscroll-contain scrollbar-thin"
								>
									{list.length === 0 ? (
										<div className="h-full flex items-center justify-center text-xs text-muted-text italic">
											Trống
										</div>
									) : (
										list.map((b) => (
											<Button
												key={b.id}
												type="button"
												variant="ghost"
												onClick={() => onOpenDetail(b)}
												aria-label={`Mở lịch ${b.code} của ${b.pet.name}, ${b.service.scheduledTime.split(" ")[0]}, trạng thái ${getStatusPresentation(b.status).label}`}
												className={`h-auto w-full justify-start text-left p-1.5 rounded-lg border hover:bg-transparent hover:brightness-95 shadow-2xs transition-all space-y-0.5 ${getStatusPresentation(b.status).bg}`}
											>
												<div className="flex justify-between items-center text-xs">
													<span className="font-bold text-primary text-xs">
														{b.service.timeRange ||
															b.service.scheduledTime.split(" ")[0]}
													</span>
													<Badge
														variant="outline"
														className="text-xs px-1 py-0 bg-surface font-medium"
													>
														{b.code}
													</Badge>
												</div>
												<p className="font-bold text-ink text-xs truncate">
													{b.pet.name} ({b.pet.breed.split(" ")[0]})
												</p>
												<span className="inline-flex rounded-md border border-current/20 bg-surface/70 px-1.5 py-0.5 text-xs font-semibold">
													{getStatusPresentation(b.status).label}
												</span>
												<p className="text-xs font-semibold text-slate-700 truncate">
													{b.service.assignedStaff}
												</p>
											</Button>
										))
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
