"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PetDraft, PetProfile } from "@/lib/admin-pet-profile";

interface PetEditDialogProps {
	open: boolean;
	pet: PetProfile | null;
	petDraft: PetDraft;
	setPetDraft: React.Dispatch<React.SetStateAction<PetDraft>>;
	operationError: string | null;
	isSaving: boolean;
	onOpenChange: (open: boolean) => void;
	handleSavePet: (event: React.FormEvent<HTMLFormElement>) => void;
	onCancel: () => void;
}

export function PetEditDialog({
	open,
	pet,
	petDraft,
	setPetDraft,
	operationError,
	isSaving,
	onOpenChange,
	handleSavePet,
	onCancel,
}: PetEditDialogProps) {
	return (
		<Dialog open={open && pet !== null} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-xl sm:p-6"
			>
				{pet && (
					<form onSubmit={handleSavePet} className="space-y-4">
						<DialogHeader className="flex-row items-start justify-between gap-3">
							<div className="space-y-1">
								<DialogTitle className="text-lg font-semibold text-ink">
									Cập nhật hồ sơ {pet.name}
								</DialogTitle>
								<DialogDescription className="text-xs text-muted-text">
									Thông tin được lưu vào hồ sơ hiện tại.
								</DialogDescription>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Đóng biểu mẫu"
								onClick={onCancel}
								className="size-10 -mr-2 -mt-2 shrink-0 text-muted-text"
							>
								<X aria-hidden="true" className="size-4" />
							</Button>
						</DialogHeader>
						<div className="grid gap-3 sm:grid-cols-2">
						<label className="text-sm font-medium">
								Tên thú cưng <span aria-hidden="true">*</span>
								<Input
									required
									value={petDraft.name}
									onChange={(event) =>
										setPetDraft((draft) => ({
											...draft,
											name: event.target.value,
										}))
									}
									className="mt-1 h-10 text-sm"
								/>
							</label>
						<label className="text-sm font-medium">
								Giống <span aria-hidden="true">*</span>
								<Input
									required
									value={petDraft.breed}
									onChange={(event) =>
										setPetDraft((draft) => ({
											...draft,
											breed: event.target.value,
										}))
									}
									className="mt-1 h-10 text-sm"
								/>
							</label>
						<label className="text-sm font-medium">
								Cân nặng (kg) <span aria-hidden="true">*</span>
								<Input
									required
									type="number"
									min="0.1"
									max="100"
									step="0.1"
									value={petDraft.weightKg}
									onChange={(event) =>
										setPetDraft((draft) => ({
											...draft,
											weightKg: event.target.value,
										}))
									}
									className="mt-1 h-10 text-sm"
								/>
							</label>
						<label className="text-sm font-medium">
								Tuổi (tháng)
								<Input
									type="number"
									min="0"
									value={petDraft.ageMonths}
									onChange={(event) =>
										setPetDraft((draft) => ({
											...draft,
											ageMonths: event.target.value,
										}))
									}
									className="mt-1 h-10 text-sm"
								/>
							</label>
						</div>
					<label className="block text-sm font-medium">
							Ghi chú
							<Textarea
								value={petDraft.notes}
								onChange={(event) =>
									setPetDraft((draft) => ({
										...draft,
										notes: event.target.value,
									}))
								}
								rows={3}
								className="mt-1 text-sm"
							/>
						</label>
						<label className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={petDraft.hasVaccine}
								onCheckedChange={(checked) =>
									setPetDraft((draft) => ({
										...draft,
										hasVaccine: checked === true,
									}))
								}
							/>{" "}
							Đã đánh dấu tiêm phòng
						</label>
						{operationError && (
							<p role="alert" className="text-sm text-red-700">
								{operationError}
							</p>
						)}
						<DialogFooter className="-mx-5 -mb-5 border-border-subtle bg-slate-50 p-4 sm:-mx-6 sm:-mb-6">
							<Button type="button" variant="outline" onClick={onCancel}>
								Hủy
							</Button>
							<Button type="submit" disabled={isSaving}>
								{isSaving ? "Đang lưu…" : "Lưu hồ sơ"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
