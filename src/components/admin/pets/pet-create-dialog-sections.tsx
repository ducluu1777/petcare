"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UserListItem } from "@/hooks/use-users";
import type { PetCreateDraft } from "@/components/admin/pets/pet-create-dialog.types";

interface PetOwnerSectionProps {
	customerSearch: string;
	onCustomerSearchChange: (value: string) => void;
	selectedCustomer: UserListItem | null;
	customerOptions: UserListItem[];
	areCustomersLoading: boolean;
	isCustomerSearchPending: boolean;
	didCustomersFail: boolean;
	showCustomerError: boolean;
	normalizedSearch: string;
	showNoCustomersMessage: boolean;
	hasMoreCustomers: boolean;
	onRetryCustomers: () => void;
	onSelectCustomer: (customer: UserListItem | null) => void;
}

function getCustomerContact(customer: UserListItem) {
	return customer.phone || customer.email || "Chưa có thông tin liên hệ";
}

export function PetOwnerSection({
	customerSearch,
	onCustomerSearchChange,
	selectedCustomer,
	customerOptions,
	areCustomersLoading,
	isCustomerSearchPending,
	didCustomersFail,
	showCustomerError,
	normalizedSearch,
	showNoCustomersMessage,
	hasMoreCustomers,
	onRetryCustomers,
	onSelectCustomer,
}: PetOwnerSectionProps) {
	return (
		<section aria-labelledby="pet-owner-heading" className="space-y-3 rounded-xl border border-border-subtle bg-slate-50 p-4">
			<div>
				<h2 id="pet-owner-heading" className="text-sm font-semibold text-ink">Chủ nuôi</h2>
				<p className="mt-1 text-xs leading-5 text-muted-text">Tìm bằng tên, số điện thoại hoặc email. Biểu mẫu này chỉ chọn tài khoản khách hàng đã có.</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
				<div className="space-y-1.5">
					<Label htmlFor="pet-customer-search" className="text-sm">Tìm khách hàng</Label>
					<Input
						id="pet-customer-search"
						value={customerSearch}
						onChange={(event) => onCustomerSearchChange(event.target.value)}
						placeholder="Tên, số điện thoại hoặc email"
						className="h-10"
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="pet-customer-select" className="text-sm">Khách hàng <span aria-hidden="true">*</span></Label>
					<Select
						items={customerOptions.map((customer) => ({ value: customer.id, label: `${customer.name}${customer.isActive === false ? " · Đã khóa" : ""} · ${getCustomerContact(customer)}` }))}
						value={selectedCustomer?.id ?? ""}
						disabled={areCustomersLoading || isCustomerSearchPending || didCustomersFail}
						onValueChange={(customerId) => {
							const customer = customerOptions.find((item) => item.id === customerId);
							onSelectCustomer(customer ?? null);
						}}
					>
						<SelectTrigger id="pet-customer-select" className="h-10 w-full">
							<SelectValue placeholder={areCustomersLoading || isCustomerSearchPending ? "Đang tìm khách hàng…" : "Chọn khách hàng"} />
						</SelectTrigger>
						<SelectContent>
							{customerOptions.map((customer) => (
								<SelectItem key={customer.id} value={customer.id}>
									<div className="flex min-w-0 flex-col gap-0.5 py-0.5">
										<span className="truncate font-medium">{customer.name}{customer.isActive === false ? " · Đã khóa" : ""}</span>
										<span className="truncate text-xs text-muted-text">{getCustomerContact(customer)}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			{showCustomerError ? (
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-red-700" role="alert">
					<span>Không tải được danh sách khách hàng.</span>
					<Button type="button" variant="outline" size="sm" onClick={onRetryCustomers} className="h-10">Thử tải lại</Button>
				</div>
			) : isCustomerSearchPending ? (
				<p className="text-xs text-muted-text" role="status">Đang tìm khách hàng…</p>
			) : showNoCustomersMessage ? (
				<p className="text-xs text-muted-text" role="status">
					{normalizedSearch ? "Không tìm thấy khách hàng phù hợp." : "Chưa có tài khoản khách hàng trong hệ thống."}
				</p>
			) : hasMoreCustomers ? (
				<p className="text-xs text-muted-text">Có nhiều khách hàng phù hợp. Nhập thêm tên, số điện thoại hoặc email để thu hẹp kết quả.</p>
			) : null}
			{selectedCustomer && (
				<div className="rounded-lg border border-teal-200 bg-surface px-3 py-2 text-xs text-primary-dark">
					Đã chọn <span className="font-semibold">{selectedCustomer.name}{selectedCustomer.isActive === false ? " · Đã khóa" : ""}</span> · {getCustomerContact(selectedCustomer)}
				</div>
			)}
		</section>
	);
}

interface PetDetailsSectionProps {
	draft: PetCreateDraft;
	onDraftChange: Dispatch<SetStateAction<PetCreateDraft>>;
}

export function PetDetailsSection({ draft, onDraftChange }: PetDetailsSectionProps) {
	return (
		<section aria-labelledby="pet-info-heading" className="space-y-3">
			<h2 id="pet-info-heading" className="text-sm font-semibold text-ink">Thông tin thú cưng</h2>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="pet-create-name" className="text-sm">Tên thú cưng <span aria-hidden="true">*</span></Label>
					<Input id="pet-create-name" required maxLength={100} value={draft.name} onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))} placeholder="VD: Bông" className="h-10" />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="pet-create-species" className="text-sm">Loài <span aria-hidden="true">*</span></Label>
					<Select items={{ DOG: "Chó", CAT: "Mèo" }} value={draft.species} onValueChange={(species) => onDraftChange((current) => ({ ...current, species: species as PetCreateDraft["species"] }))}>
						<SelectTrigger id="pet-create-species" className="h-10 w-full"><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="DOG">Chó</SelectItem>
							<SelectItem value="CAT">Mèo</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="pet-create-breed" className="text-sm">Giống <span aria-hidden="true">*</span></Label>
					<Input id="pet-create-breed" required maxLength={100} value={draft.breed} onChange={(event) => onDraftChange((current) => ({ ...current, breed: event.target.value }))} placeholder="VD: Poodle, mèo Anh lông ngắn" className="h-10" />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="pet-create-weight" className="text-sm">Cân nặng (kg) <span aria-hidden="true">*</span></Label>
					<Input id="pet-create-weight" required type="number" min="0.1" max="100" step="0.1" value={draft.weightKg} onChange={(event) => onDraftChange((current) => ({ ...current, weightKg: event.target.value }))} placeholder="VD: 5.5" className="h-10" />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="pet-create-age" className="text-sm">Tuổi (tháng)</Label>
					<Input id="pet-create-age" type="number" min="0" step="1" value={draft.ageMonths} onChange={(event) => onDraftChange((current) => ({ ...current, ageMonths: event.target.value }))} placeholder="Để trống nếu chưa rõ" className="h-10" />
				</div>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="pet-create-notes" className="text-sm">Ghi chú</Label>
				<Textarea id="pet-create-notes" maxLength={2000} value={draft.notes} onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))} placeholder="Dị ứng, lưu ý khi chăm sóc hoặc thông tin sức khỏe cần biết." rows={3} />
			</div>
			<label className="flex min-h-10 items-center gap-2 text-sm text-ink">
				<Checkbox checked={draft.hasVaccine} onCheckedChange={(checked) => onDraftChange((current) => ({ ...current, hasVaccine: checked === true }))} />
				Đã ghi nhận tiêm phòng
			</label>
		</section>
	);
}
