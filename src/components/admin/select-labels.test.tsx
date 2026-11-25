import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductListFilters, type ProductActiveFilter } from "./products/product-list-filters";
import { ServiceListFilters, type ServiceActiveFilter } from "./services/service-list-filters";
import { ServiceBasicFields } from "./services/service-basic-fields";
import { CalendarScheduleToolbar } from "./bookings/calendar-schedule-toolbar";
import { TransactionListFilters, type TransactionSourceFilter } from "./transactions/transaction-list-filters";
import { VoucherRedemptionFields } from "./vouchers/voucher-redemption-fields";
import { PetDetailsSection, PetOwnerSection } from "./pets/pet-create-dialog-sections";
import { UserTableRow } from "./users/user-table-row";
import type { UserListItem } from "@/hooks/use-users";

const noop = () => {};

function selectedLabel(markup: string) {
  return markup.match(/data-slot="select-value"[^>]*>(.*?)<\/span>/s)?.[1];
}

describe("Closed Admin dropdowns", () => {
  it.each([
    ["ACTIVE", "Đang bán"],
    ["INACTIVE", "Ngừng bán"],
    ["ALL", "Tất cả trạng thái"],
  ] satisfies Array<[ProductActiveFilter, string]>)("shows the product filter %s as %s before opening", (activeFilter, label) => {
    const markup = renderToStaticMarkup(<ProductListFilters searchQuery="" selectedCategory="ALL" activeFilter={activeFilter} onSearchChange={noop} onCategoryChange={noop} onActiveFilterChange={noop} />);
    expect(selectedLabel(markup)).toBe(label);
  });

  it.each([
    ["ACTIVE", "Đang cung cấp"],
    ["INACTIVE", "Tạm ngừng"],
    ["ALL", "Tất cả trạng thái"],
  ] satisfies Array<[ServiceActiveFilter, string]>)("shows the service filter %s as %s before opening", (activeFilter, label) => {
    const markup = renderToStaticMarkup(<ServiceListFilters searchQuery="" categoryFilter="ALL" activeFilter={activeFilter} totalCount={0} spaCount={0} addonCount={0} onSearchQueryChange={noop} onCategoryFilterChange={noop} onActiveFilterChange={noop} />);
    expect(selectedLabel(markup)).toBe(label);
  });

  it.each([
    ["BATH", "Tắm và sấy"], ["GROOMING", "Cắt tỉa lông"], ["CAT_SPA", "Chăm sóc chuyên biệt cho mèo"], ["", "Chọn danh mục"],
  ] as const)("shows service category %s as %s", (category, label) => {
    const markup = renderToStaticMarkup(<ServiceBasicFields editing={false} name="" slug="" tagline="" description="" category={category} isAddon={false} onNameChange={noop} onSlugChange={noop} onTaglineChange={noop} onDescriptionChange={noop} onCategoryChange={noop} onAddonChange={noop} />);
    expect(selectedLabel(markup)).toBe(label);
  });

  it.each([
    ["ALL", "Tất cả trạng thái"], ["WAITING_CHECKIN", "Đã đặt"], ["ARRIVED", "Đã tiếp nhận"], ["IN_PROGRESS", "Đang chăm sóc"],
    ["READY_FOR_PICKUP", "Chờ khách nhận"], ["COMPLETED", "Hoàn tất"], ["CANCELLED", "Đã hủy"], ["NO_SHOW", "Không đến"],
  ])("shows calendar state %s as %s", (statusFilter, label) => {
    const markup = renderToStaticMarkup(<CalendarScheduleToolbar mode="DAY" onModeChange={noop} onPrevious={noop} onNext={noop} onToday={noop} dateRangeLabel="Hôm nay" statusFilter={statusFilter} onStatusFilterChange={noop} hasClosedDates={false} showClosedDates={false} onShowClosedDatesChange={noop} bookingDate="2026-11-01" bookingDateLabel="Hôm nay" isBookingDateClosed={false} onNewBooking={noop} />);
    expect(selectedLabel(markup)).toBe(label);
  });

  it.each([
    ["ALL", "Tất cả nguồn (—)"], ["BOOKING", "Lịch dịch vụ (—)"], ["ONLINE_ORDER", "Đơn online (—)"], ["IN_STORE", "Bán tại quầy (—)"], ["OTHER", "Khác (—)"],
  ] satisfies Array<[TransactionSourceFilter, string]>)("shows transaction source %s as %s", (sourceFilter, label) => {
    const markup = renderToStaticMarkup(<TransactionListFilters methodFilter="ALL" sourceFilter={sourceFilter} searchQuery="" dateFrom="" dateTo="" hasInvalidDateRange={false} allCount={null} qrCount={null} cashCount={null} sourceCounts={null} onMethodChange={noop} onSourceChange={noop} onSearchChange={noop} onDateFromChange={noop} onDateToChange={noop} />);
    expect(selectedLabel(markup)).toBe(label);
  });

  it.each([["POINTS", "Đổi bằng điểm tích lũy"], ["CODE", "Dùng mã voucher"], [null, "Chọn cách nhận voucher"]] as const)("shows voucher type %s as %s", (redemptionType, label) => {
    expect(selectedLabel(renderToStaticMarkup(<VoucherRedemptionFields redemptionType={redemptionType} onRedemptionTypeChange={noop} />))).toBe(label);
  });

  it.each([["DOG", "Chó"], ["CAT", "Mèo"]] as const)("shows species %s as %s", (species, label) => {
    const markup = renderToStaticMarkup(<PetDetailsSection draft={{ name: "Bông", species, breed: "", weightKg: "5", ageMonths: "", notes: "", hasVaccine: false }} onDraftChange={noop} />);
    expect(selectedLabel(markup)).toBe(label);
  });

  const customer: UserListItem = { id: "internal-customer-id", name: "Mai", phone: "0900000000", email: null, avatarUrl: null, role: "CUSTOMER", loyaltyPoints: 0, createdAt: "2026-11-01", updatedAt: "2026-11-01" };

  it.each([["CUSTOMER", "Khách hàng"], ["STAFF", "Nhân viên"], ["ADMIN", "Quản trị viên"]] as const)("shows role %s as %s", (role, label) => {
    expect(selectedLabel(renderToStaticMarkup(<UserTableRow user={{ ...customer, role }} onRoleChange={noop} onView={noop} />))).toBe(label);
  });

  it("shows the selected customer name and contact instead of their internal ID", () => {
    const markup = renderToStaticMarkup(<PetOwnerSection customerSearch="" onCustomerSearchChange={noop} selectedCustomer={customer} customerOptions={[customer]} areCustomersLoading={false} isCustomerSearchPending={false} didCustomersFail={false} showCustomerError={false} normalizedSearch="" showNoCustomersMessage={false} hasMoreCustomers={false} onRetryCustomers={noop} onSelectCustomer={noop} />);
    expect(selectedLabel(markup)).toBe("Mai · 0900000000");
  });
});
