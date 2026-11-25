"use client";

import * as React from "react";
import {
  useAllVouchers,
  useCreateVoucher,
  useSpaBookingPromotion,
  useUpdateSpaBookingPromotion,
  useUpdateVoucher,
  type UpdateVoucherPayload,
  type VoucherItem,
} from "@/hooks/use-vouchers";
import { getVoucherAvailability } from "@/lib/voucher-availability";
import type { VoucherDiscountType, VoucherRedemptionType } from "@/lib/admin-voucher-types";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export function useAdminVouchersWorkflow() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [voucherBeingEdited, setVoucherBeingEdited] = React.useState<VoucherItem | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const [code, setCode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [discountType, setDiscountType] = React.useState<VoucherDiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = React.useState("");
  const [maxDiscount, setMaxDiscount] = React.useState("");
  const [minSpend, setMinSpend] = React.useState("");
  const [redemptionType, setRedemptionType] = React.useState<VoucherRedemptionType | null>(null);
  const [usageLimitPerUser, setUsageLimitPerUser] = React.useState("");
  const [pointCost, setPointCost] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");

  const vouchersQuery = useAllVouchers();
  const spaPromotionQuery = useSpaBookingPromotion();
  const createVoucher = useCreateVoucher();
  const updateVoucher = useUpdateVoucher();
  const updateSpaPromotion = useUpdateSpaBookingPromotion();

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const voucherList: VoucherItem[] = React.useMemo(
    () => Array.isArray(vouchersQuery.data) ? vouchersQuery.data : [],
    [vouchersQuery.data],
  );
  const filteredVouchers = React.useMemo(() => voucherList.filter((voucher) => {
    const query = searchQuery.trim().toLowerCase();
    return voucher.code.toLowerCase().includes(query) || voucher.title.toLowerCase().includes(query);
  }), [voucherList, searchQuery]);
  const stats = React.useMemo(() => ({
    total: voucherList.length,
    active: voucherList.filter((voucher) => getVoucherAvailability(voucher, now) === "AVAILABLE").length,
    rewards: voucherList.filter((voucher) => (voucher.pointCost || 0) > 0).length,
  }), [voucherList, now]);

  const totalPages = Math.max(1, Math.ceil(filteredVouchers.length / PAGE_SIZE));
  const visibleVouchers = filteredVouchers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstVoucher = filteredVouchers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVoucher = Math.min(page * PAGE_SIZE, filteredVouchers.length);

  const resetVoucherForm = () => {
    setCode("");
    setTitle("");
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("");
    setMaxDiscount("");
    setMinSpend("");
    setRedemptionType(null);
    setUsageLimitPerUser("");
    setPointCost("");
    setExpiryDate("");
  };

  const handleVoucherModalOpenChange = (open: boolean) => {
    if (!open) resetVoucherForm();
    setIsModalOpen(open);
  };

  const handleCreateVoucher = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!redemptionType) {
      toast.error("Chọn cách nhận voucher trước khi lưu.");
      return;
    }
    if (redemptionType === "CODE" && usageLimitPerUser !== "1" && usageLimitPerUser !== "-1") {
      toast.error("Chọn lượt dùng cho mỗi tài khoản trước khi lưu.");
      return;
    }
    try {
      await createVoucher.mutateAsync({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        maxDiscount: discountType === "PERCENTAGE" ? Number(maxDiscount) : undefined,
        minSpend: Number(minSpend),
        pointCost: redemptionType === "POINTS" ? Number(pointCost) : undefined,
        usageLimitPerUser: redemptionType === "CODE" ? Number(usageLimitPerUser) as 1 | -1 : undefined,
        expiryDate,
      });
      toast.success(`Đã tạo voucher ${code.toUpperCase()}.`);
      handleVoucherModalOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo voucher. Vui lòng kiểm tra lại.");
    }
  };

  const handleToggleVoucherActive = async (voucher: VoucherItem) => {
    try {
      await updateVoucher.mutateAsync({
        id: voucher.id,
        data: { isActive: !voucher.isActive },
      });
      toast.success(`Đã ${voucher.isActive ? "tạm ngưng" : "kích hoạt lại"} voucher ${voucher.code}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái voucher.");
    }
  };

  const handleToggleSpaPromotion = async () => {
    if (spaPromotionQuery.data === undefined) return;
    try {
      const nextActive = !spaPromotionQuery.data.active;
      await updateSpaPromotion.mutateAsync(nextActive);
      toast.success(nextActive ? "Đã bật ưu đãi đặt lịch Spa." : "Đã tạm ngưng ưu đãi đặt lịch Spa.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật ưu đãi đặt lịch Spa.");
    }
  };

  const handleUpdateVoucher = async (data: UpdateVoucherPayload) => {
    if (!voucherBeingEdited) return;
    try {
      await updateVoucher.mutateAsync({ id: voucherBeingEdited.id, data });
      toast.success(`Đã cập nhật hạn dùng và giới hạn lượt cho ${voucherBeingEdited.code}.`);
      setVoucherBeingEdited(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật voucher.");
    }
  };

  const voucherFormState = {
    open: isModalOpen,
    code,
    title,
    description,
    discountType,
    discountValue,
    maxDiscount,
    minSpend,
    redemptionType,
    usageLimitPerUser,
    pointCost,
    expiryDate,
    isCreating: createVoucher.isPending,
  };
  const voucherFormActions = {
    onOpenChange: handleVoucherModalOpenChange,
    setCode,
    setTitle,
    setDescription,
    setDiscountType,
    setDiscountValue,
    setMaxDiscount,
    setMinSpend,
    setRedemptionType,
    setUsageLimitPerUser,
    setPointCost,
    setExpiryDate,
    onSubmit: handleCreateVoucher,
  };

  const promotionPanelProps = {
    isLoading: spaPromotionQuery.isFetching,
    hasError: spaPromotionQuery.isError,
    isActive: spaPromotionQuery.data?.active ?? false,
    isUpdating: updateSpaPromotion.isPending,
    onToggle: handleToggleSpaPromotion,
    onRetry: () => { void spaPromotionQuery.refetch(); },
  };
  const voucherEditProps = {
    open: !!voucherBeingEdited,
    voucher: voucherBeingEdited,
    isSaving: updateVoucher.isPending,
    onOpenChange: (open: boolean) => { if (!open) setVoucherBeingEdited(null); },
    onSubmit: handleUpdateVoucher,
  };

  return {
    firstVoucher,
    filteredVouchers,
    handleSearchChange: (query: string) => { setPage(1); setSearchQuery(query); },
    handleToggleVoucherActive,
    isError: vouchersQuery.isError,
    isFetching: vouchersQuery.isFetching,
    isLoading: vouchersQuery.isLoading,
    lastVoucher,
    openVoucherCreateDialog: () => setIsModalOpen(true),
    page,
    pageSize: PAGE_SIZE,
    promotionPanelProps,
    refetch: vouchersQuery.refetch,
    searchQuery,
    setPage,
    setVoucherBeingEdited,
    stats,
    totalPages,
    visibleVouchers,
    voucherEditKey: voucherBeingEdited?.id ?? "closed",
    voucherEditProps,
    voucherFormActions,
    voucherFormState,
    voucherList,
  };
}
