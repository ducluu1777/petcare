"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useCreatePet } from "@/hooks/use-pets";
import { useUsersList, type UserListItem } from "@/hooks/use-users";
import { PetDetailsSection, PetOwnerSection } from "@/components/admin/pets/pet-create-dialog-sections";
import type { PetCreateDraft } from "@/components/admin/pets/pet-create-dialog.types";

const initialDraft: PetCreateDraft = {
	name: "",
	species: "DOG",
	breed: "",
	weightKg: "",
	ageMonths: "",
	notes: "",
	hasVaccine: false,
};

const emptyCustomers: UserListItem[] = [];

interface PetCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PetCreateDialog({ open, onOpenChange }: PetCreateDialogProps) {
	const [draft, setDraft] = React.useState<PetCreateDraft>(initialDraft);
	const [customerSearch, setCustomerSearch] = React.useState("");
	const [debouncedCustomerSearch, setDebouncedCustomerSearch] = React.useState("");
	const [selectedCustomer, setSelectedCustomer] = React.useState<UserListItem | null>(null);
	const [formError, setFormError] = React.useState<string | null>(null);
	const createPet = useCreatePet();
	const normalizedSearch = customerSearch.trim();
	const isCustomerSearchPending = normalizedSearch !== debouncedCustomerSearch;

	React.useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedCustomerSearch(normalizedSearch), 250);
		return () => window.clearTimeout(timer);
	}, [normalizedSearch]);

	const {
		data: customersResult,
		isLoading: areCustomersLoading,
		isError: didCustomersFail,
		refetch: refetchCustomers,
	} = useUsersList({
		role: "CUSTOMER",
		isActive: true,
		search: debouncedCustomerSearch || undefined,
		page: 1,
		limit: 20,
	}, open);

	const customers = customersResult?.data ?? emptyCustomers;
	const customerOptions = selectedCustomer && !customers.some((customer) => customer.id === selectedCustomer.id)
		? [selectedCustomer, ...customers]
		: customers;

	const resetForm = () => {
		setDraft(initialDraft);
		setCustomerSearch("");
		setDebouncedCustomerSearch("");
		setSelectedCustomer(null);
		setFormError(null);
		createPet.reset();
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && createPet.isPending) return;
		if (!nextOpen) resetForm();
		onOpenChange(nextOpen);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError(null);

		if (!selectedCustomer) {
			setFormError("Vui lòng chọn một khách hàng có sẵn trong hệ thống.");
			return;
		}
		if (!draft.name.trim() || !draft.breed.trim()) {
			setFormError("Vui lòng nhập tên thú cưng và giống.");
			return;
		}

		const weightKg = Number(draft.weightKg);
		const ageMonths = draft.ageMonths.trim() ? Number(draft.ageMonths) : undefined;
		if (!Number.isFinite(weightKg) || weightKg < 0.1 || weightKg > 100) {
			setFormError("Cân nặng phải từ 0,1 đến 100 kg.");
			return;
		}
		if (ageMonths !== undefined && (!Number.isInteger(ageMonths) || ageMonths < 0)) {
			setFormError("Tuổi phải là số tháng nguyên từ 0 trở lên.");
			return;
		}

		try {
			await createPet.mutateAsync({
				name: draft.name.trim(),
				species: draft.species,
				breed: draft.breed.trim(),
				weightKg,
				...(ageMonths !== undefined ? { ageMonths } : {}),
				...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
				hasVaccine: draft.hasVaccine,
				userId: selectedCustomer.id,
			});
			handleOpenChange(false);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Không thể tạo hồ sơ thú cưng.");
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-2xl sm:p-6"
			>
				<form onSubmit={handleSubmit}>
					<fieldset disabled={createPet.isPending} className="space-y-5 border-0 p-0">
						<DialogHeader className="flex-row items-start justify-between gap-3">
							<div className="space-y-1">
								<DialogTitle className="text-lg font-semibold text-ink">Tạo hồ sơ thú cưng</DialogTitle>
								<DialogDescription className="text-sm text-muted-text">
									Chọn khách hàng đã có tài khoản rồi nhập thông tin thú cưng.
								</DialogDescription>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Đóng biểu mẫu"
								onClick={() => handleOpenChange(false)}
								className="-mr-2 -mt-2 size-10 shrink-0 text-muted-text"
							>
								<X aria-hidden="true" className="size-4" />
							</Button>
						</DialogHeader>

						<PetOwnerSection
							customerSearch={customerSearch}
							onCustomerSearchChange={setCustomerSearch}
							selectedCustomer={selectedCustomer}
							customerOptions={customerOptions}
							areCustomersLoading={areCustomersLoading}
							isCustomerSearchPending={isCustomerSearchPending}
							didCustomersFail={didCustomersFail}
							showCustomerError={didCustomersFail && !isCustomerSearchPending}
							normalizedSearch={normalizedSearch}
							showNoCustomersMessage={!areCustomersLoading && customers.length === 0}
							hasMoreCustomers={Boolean(customersResult?.meta.totalPages && customersResult.meta.totalPages > 1)}
							onRetryCustomers={() => void refetchCustomers()}
							onSelectCustomer={(customer) => {
								setSelectedCustomer(customer);
								setFormError(null);
							}}
						/>

						<PetDetailsSection draft={draft} onDraftChange={setDraft} />

						{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}

						<DialogFooter className="-mx-5 -mb-5 border-border-subtle bg-slate-50 p-4 sm:-mx-6 sm:-mb-6">
							<Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={createPet.isPending}>Hủy</Button>
							<Button type="submit" disabled={createPet.isPending || areCustomersLoading || isCustomerSearchPending || didCustomersFail}>
								{createPet.isPending ? "Đang tạo…" : "Tạo hồ sơ"}
							</Button>
						</DialogFooter>
					</fieldset>
				</form>
			</DialogContent>
		</Dialog>
	);
}
