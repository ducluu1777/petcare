"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { PetBehaviorCard } from "@/components/admin/pets/pet-behavior-card";
import { PetRecentBookingsCard } from "@/components/admin/pets/pet-recent-bookings-card";
import type { PetProfile } from "@/lib/admin-pet-profile";

type BehavioralFlag = NonNullable<PetProfile["behavioralFlag"]>;

interface PetDetailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pet: PetProfile | null;
	operationError: string | null;
	isUpdatingBehavior: boolean;
	onUpdateBehavior: (flag: BehavioralFlag) => void;
	onEdit: () => void;
	onArchive: () => Promise<boolean>;
	onRestore: () => Promise<void>;
	isArchiving: boolean;
	isRestoring: boolean;
}

export function PetDetailSheet({
	open: isSheetOpen,
	onOpenChange: setIsSheetOpen,
	pet: selectedPet,
	operationError,
	isUpdatingBehavior,
	onUpdateBehavior: handleUpdateFlag,
	onEdit: startEditingPet,
	onArchive,
	onRestore,
	isArchiving,
	isRestoring,
}: PetDetailSheetProps) {
	const [isArchiveDialogOpen, setIsArchiveDialogOpen] = React.useState(false);

	const confirmArchive = async () => {
		if (await onArchive()) setIsArchiveDialogOpen(false);
	};

	return (
		<>
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<SheetContent
				side="right"
				className="w-[90vw] sm:w-[800px] max-w-[95vw] bg-slate-50 border-l border-border-subtle p-0 flex flex-col h-dvh max-h-dvh shadow-2xl z-50"
			>
				{selectedPet && (
					<>
						<SheetHeader className="p-6 border-b border-border-subtle bg-surface shrink-0">
							<div className="flex items-center justify-between">
								<Badge
									variant="outline"
									className="text-xs bg-slate-100 font-bold"
								>
									{selectedPet.code}
								</Badge>
								<span className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-50 text-primary border border-teal-200">
									{selectedPet.species} • {selectedPet.breed}
								</span>
								{selectedPet.isArchived && (
									<Badge variant="secondary" className="text-xs">Đã lưu trữ</Badge>
								)}
							</div>
							<SheetTitle className="text-xl font-bold text-ink mt-2">
								Hồ sơ thú cưng: {selectedPet.name}
							</SheetTitle>
							<SheetDescription className="text-xs text-muted-text">
								Chủ nuôi: <strong>{selectedPet.ownerName}</strong>
								{selectedPet.ownerContact
									? ` · ${selectedPet.ownerContactType}: ${selectedPet.ownerContact}`
									: ` · ${selectedPet.ownerContactType}`}
							</SheetDescription>
						</SheetHeader>

						<div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
							{operationError && (
								<p
									role="alert"
									className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
								>
									{operationError}
								</p>
							)}

							{/* Thông số hình thể */}
							<div className="bg-surface p-4 rounded-xl border border-border-subtle shadow-xs space-y-3">
								<span className="block font-semibold text-slate-700">
									Thông tin hình thể và sức khỏe
								</span>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
									<div className="p-3 bg-slate-50 rounded-lg border border-border-subtle">
										<span className="text-muted-text block text-xs">
											Cân nặng:
										</span>
										<strong className="text-ink text-base block mt-0.5 tabular-nums">
											{selectedPet.weight == null
												? "Chưa cập nhật"
												: `${selectedPet.weight} kg`}
										</strong>
									</div>
									<div className="p-3 bg-slate-50 rounded-lg border border-border-subtle">
										<span className="text-muted-text block text-xs">
											Độ tuổi:
										</span>
										<strong className="text-ink text-sm block mt-0.5">
											{selectedPet.age}
										</strong>
									</div>
									<div className="p-3 bg-slate-50 rounded-lg border border-border-subtle">
										<span className="text-muted-text block text-xs">
											Tiêm phòng:
										</span>
										<strong className="text-ink text-sm block mt-0.5">
											{selectedPet.vaccinationStatus}
										</strong>
									</div>
								</div>
							</div>

							<PetBehaviorCard
								notes={selectedPet.notes}
								warnings={selectedPet.behaviorWarnings}
								flag={selectedPet.behavioralFlag ?? "NORMAL"}
								isUpdating={isUpdatingBehavior}
								onUpdate={handleUpdateFlag}
							/>

							<PetRecentBookingsCard
								totalBookings={selectedPet.totalBookings}
								recentBookings={selectedPet.recentBookings}
							/>
						</div>

						<div className="p-5 border-t border-border-subtle bg-surface shrink-0 flex justify-between gap-2">
							{selectedPet.isArchived ? (
								<Button
									type="button"
									variant="outline"
									onClick={() => void onRestore()}
									disabled={isRestoring}
                                    className="h-10 rounded-lg border-border-subtle px-4 text-sm font-semibold"
								>
									{isRestoring ? "Đang khôi phục…" : "Khôi phục hồ sơ"}
								</Button>
							) : (
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsArchiveDialogOpen(true)}
                                    className="h-10 rounded-lg border-border-subtle px-4 text-sm font-semibold text-slate-700"
								>
									Lưu trữ hồ sơ
								</Button>
							)}
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsSheetOpen(false)}
                                    className="h-10 rounded-lg border-border-subtle px-4 text-sm font-semibold hover:bg-slate-100"
							>
								Đóng
							</Button>
							<Button
								type="button"
								onClick={startEditingPet}
                                    className="h-10 rounded-lg px-5 text-sm font-bold shadow-xs"
							>
								Chỉnh sửa hồ sơ
							</Button>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
		<Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Lưu trữ hồ sơ của {selectedPet?.name}?</DialogTitle>
					<DialogDescription>
						Hồ sơ sẽ không còn xuất hiện khi tạo lịch mới. Thông tin và lịch sử cũ vẫn được giữ; bạn có thể khôi phục sau.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setIsArchiveDialogOpen(false)} disabled={isArchiving}>
						Để sau
					</Button>
					<Button type="button" onClick={() => void confirmArchive()} disabled={isArchiving}>
						{isArchiving ? "Đang lưu trữ…" : "Lưu trữ hồ sơ"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}
