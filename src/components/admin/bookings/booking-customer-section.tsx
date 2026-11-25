"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BookingCustomerSectionProps } from "@/components/admin/bookings/booking-create-dialog.types";
import {
  createCustomerPhoneRegistrationLink,
  isValidVietnamesePhoneNumber,
} from "@/lib/customer-phone-registration-link";

export function BookingCustomerSection({
  selectedCustomer,
  setSelectedCustomer,
  customerUsers,
  foundUsers,
  isSearchingPhone,
  walkInPhone,
  setWalkInPhone,
  setSelectedPetId,
  setWalkInPetName,
  setWalkInBreed,
  setWalkInWeight,
}: BookingCustomerSectionProps) {
  const [registrationLinkCopied, setRegistrationLinkCopied] = useState(false);
  const [registrationLinkError, setRegistrationLinkError] = useState("");
  const canCreateRegistrationLink = isValidVietnamesePhoneNumber(walkInPhone);
  const customerOptions = selectedCustomer && !customerUsers.some((customer) => customer.id === selectedCustomer.id)
    ? [selectedCustomer, ...customerUsers]
    : customerUsers;

  const handleCopyRegistrationLink = async () => {
    if (!canCreateRegistrationLink) return;

    try {
      const link = createCustomerPhoneRegistrationLink(walkInPhone, window.location.origin);
      await navigator.clipboard.writeText(link);
      setRegistrationLinkCopied(true);
      setRegistrationLinkError("");
    } catch {
      setRegistrationLinkCopied(false);
      setRegistrationLinkError("Không sao chép được link. Hãy thử lại hoặc kiểm tra quyền clipboard của trình duyệt.");
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border-subtle bg-slate-50 p-3.5">
      <h3 className="text-sm font-semibold text-slate-700">
        Khách hàng <span className="text-rose-600" aria-hidden="true">*</span>
      </h3>

      <div>
        <label htmlFor="booking-customer-select" className="mb-1 block font-semibold text-slate-700">
          Chọn tài khoản khách hàng đang hoạt động
        </label>
        <Select
            items={customerOptions.map((customer) => ({ value: customer.id, label: customer.name }))}
          value={selectedCustomer?.id ?? ""}
          onValueChange={(id) => {
            if (!id) {
              setSelectedCustomer(null);
              setSelectedPetId(null);
              setWalkInPhone("");
              setWalkInPetName("");
              setWalkInBreed("");
              setWalkInWeight("");
              return;
            }
            const found = customerOptions.find((customer) => customer.id === id);
            if (found) {
              setSelectedCustomer(found);
              setWalkInPhone(found.phone || "");
              setSelectedPetId(null);
              setWalkInPetName("");
              setWalkInBreed("");
              setWalkInWeight("");
            }
          }}
        >
          <SelectTrigger id="booking-customer-select" className="w-full font-medium text-ink">
            <SelectValue placeholder="Chọn khách hàng có tài khoản">
              {selectedCustomer
                ? `${selectedCustomer.name} ${selectedCustomer.phone ? `(${selectedCustomer.phone})` : ""} - ${selectedCustomer.loyaltyPoints} điểm (${selectedCustomer._count?.pets || 0} thú cưng)`
                : ""}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {customerOptions.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name} {customer.phone ? `(${customer.phone})` : ""} - {customer.loyaltyPoints} điểm ({customer._count?.pets || 0} thú cưng)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="booking-customer-phone" className="mb-1 block font-semibold text-slate-700">
          Tìm nhanh bằng số điện thoại
        </label>
        <Input
          id="booking-customer-phone"
          type="tel"
          inputMode="tel"
          value={walkInPhone}
          onChange={(event) => {
            const phone = event.target.value;
            setWalkInPhone(phone);
            setRegistrationLinkCopied(false);
            setRegistrationLinkError("");
            if (selectedCustomer && selectedCustomer.phone !== phone) {
              setSelectedCustomer(null);
              setSelectedPetId(null);
              setWalkInPetName("");
              setWalkInBreed("");
              setWalkInWeight("");
            }
          }}
          placeholder="Nhập ít nhất 3 số để tìm tài khoản"
        />
        <p className="mt-1 text-xs leading-relaxed text-muted-text">
          Chỉ tiếp nhận khách có tài khoản đang hoạt động. Khách chưa có tài khoản cần đăng ký trước.
        </p>
      </div>

      {isSearchingPhone && !selectedCustomer && (
        <p role="status" className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-muted-text">
          Đang tìm tài khoản theo số điện thoại
        </p>
      )}

      {Array.isArray(foundUsers) && foundUsers.length > 0 && !selectedCustomer && !isSearchingPhone && (
        <div className="space-y-1.5 rounded-lg border border-teal-200 bg-teal-50 p-2.5">
          <span className="block text-xs font-semibold text-teal-800">Khách hàng trùng khớp SĐT:</span>
          <div className="space-y-1">
            {foundUsers.map((customer) => (
              <Button
                key={customer.id}
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Chọn khách hàng ${customer.name}${customer.phone ? `, số điện thoại ${customer.phone}` : ""}`}
                onClick={() => {
                  setSelectedCustomer(customer);
                  setWalkInPhone(customer.phone || walkInPhone);
                  setSelectedPetId(null);
                  setWalkInPetName("");
                  setWalkInBreed("");
                  setWalkInWeight("");
                }}
                className="h-auto w-full justify-between rounded-md border-teal-100 bg-surface p-2 text-left text-sm hover:bg-teal-50/80 focus-visible:ring-admin-primary"
              >
                <div>
                  <strong className="text-ink">{customer.name}</strong>
                  <span className="ml-2 text-xs text-muted-text">({customer.phone})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{customer.loyaltyPoints} điểm tích lũy</span>
                  <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-white">Chọn</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {walkInPhone.trim().length >= 3 && foundUsers?.length === 0 && !selectedCustomer && !isSearchingPhone && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p>
            Không tìm thấy tài khoản đang hoạt động. Nếu đây là số của khách, gửi link để khách tự tạo tài khoản và xác thực email. Số điện thoại sẽ được lưu vào tài khoản, nhưng hiện chưa được xác thực qua SMS.
          </p>
          {canCreateRegistrationLink ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleCopyRegistrationLink()}
              className="border-amber-300 bg-surface font-semibold text-amber-950 hover:bg-amber-100"
            >
              {registrationLinkCopied ? "Đã sao chép link đăng ký" : "Sao chép link đăng ký"}
            </Button>
          ) : (
            <p className="text-amber-900">Nhập SĐT di động Việt Nam đủ 10 số để tạo link đăng ký.</p>
          )}
          {registrationLinkError && <p role="alert">{registrationLinkError}</p>}
          {registrationLinkCopied && (
            <p role="status">Gửi link cho khách. Khách cần dùng email của mình và nhập mã OTP để hoàn tất.</p>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
          <div>
            <span className="text-xs font-bold text-emerald-800">
              Khách hàng: {selectedCustomer.name} ({selectedCustomer.phone || "Chưa có SĐT"})
            </span>
            <span className="mt-0.5 block text-xs text-emerald-700">
              Điểm tích lũy: <strong>{selectedCustomer.loyaltyPoints} điểm</strong>
            </span>
          </div>
          <Button
            type="button"
            onClick={() => {
              setSelectedCustomer(null);
              setSelectedPetId(null);
              setWalkInPetName("");
              setWalkInBreed("");
              setWalkInWeight("");
            }}
            variant="link"
            className="h-auto p-0 text-sm font-semibold text-rose-600"
          >
            Bỏ chọn khách
          </Button>
        </div>
      )}
    </div>
  );
}
