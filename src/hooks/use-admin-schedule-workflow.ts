"use client";

import * as React from "react";
import {
  useShopScheduleSettings,
  useUpdateShopScheduleSettings,
  type ShopScheduleSettings,
} from "@/hooks/use-time-slots";
import { useAuthStore } from "@/stores/auth-store";

const WEEKDAYS = [
  { key: "1", label: "Thứ Hai" },
  { key: "2", label: "Thứ Ba" },
  { key: "3", label: "Thứ Tư" },
  { key: "4", label: "Thứ Năm" },
  { key: "5", label: "Thứ Sáu" },
  { key: "6", label: "Thứ Bảy" },
  { key: "7", label: "Chủ Nhật" },
] as const;

type ScheduleDraft = ShopScheduleSettings;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function toDraft(settings: ShopScheduleSettings): ScheduleDraft {
  return {
    capacity: settings.capacity,
    latePickupFeeAmount: settings.latePickupFeeAmount,
    openHours: Object.fromEntries(
      WEEKDAYS.map(({ key }) => [key, settings.openHours?.[key] ?? null]),
    ),
    holidays: [...(settings.holidays ?? [])].sort(),
  };
}

function areScheduleDraftsEqual(left: ScheduleDraft, right: ScheduleDraft) {
  return left.capacity === right.capacity
    && left.latePickupFeeAmount === right.latePickupFeeAmount
    && left.holidays.length === right.holidays.length
    && left.holidays.every((holiday, index) => holiday === right.holidays[index])
    && WEEKDAYS.every(({ key }) => {
      const leftHours = left.openHours[key];
      const rightHours = right.openHours[key];
      return leftHours === null
        ? rightHours === null
        : rightHours !== null && leftHours.open === rightHours.open && leftHours.close === rightHours.close;
    });
}

export function useAdminScheduleWorkflow() {
  const canManageSchedule = useAuthStore((state) => state.user?.role === "ADMIN");
  const settingsQuery = useShopScheduleSettings();
  const updateSettings = useUpdateShopScheduleSettings();
  const [draftOverride, setDraftOverride] = React.useState<{
    source: NonNullable<typeof settingsQuery.data>;
    value: ScheduleDraft;
  } | null>(null);
  const [holidayDraft, setHolidayDraft] = React.useState("");
  const [savedMessage, setSavedMessage] = React.useState("");

  const savedDraft = settingsQuery.data ? toDraft(settingsQuery.data) : null;
  const activeDraftOverride = settingsQuery.data && draftOverride?.source === settingsQuery.data
    ? draftOverride
    : null;
  const draft = savedDraft ? activeDraftOverride?.value ?? savedDraft : null;
  const isDirty = !!activeDraftOverride && !!savedDraft && !areScheduleDraftsEqual(activeDraftOverride.value, savedDraft);

  const openDays = draft
    ? WEEKDAYS.filter(({ key }) => draft.openHours[key] !== null).length
    : 0;
  const hasDefaultSpaHours = !!draft && WEEKDAYS.every(({ key }) => {
    const hours = draft.openHours[key];
    return hours?.open === "08:30" && hours.close === "18:30";
  });
  const invalidHours = !!draft && WEEKDAYS.some(({ key }) => {
    const hours = draft.openHours[key];
    return hours !== null && (!hours.open || !hours.close || hours.open >= hours.close);
  });
  const canSave = canManageSchedule && !!draft && isDirty && !invalidHours
    && Number.isInteger(draft.capacity) && draft.capacity >= 1
    && Number.isInteger(draft.latePickupFeeAmount) && draft.latePickupFeeAmount >= 0;

  const updateDraft = (update: (current: ScheduleDraft) => ScheduleDraft) => {
    if (!canManageSchedule || !settingsQuery.data || !draft) return;
    setDraftOverride((current) => {
      const currentDraft = current?.source === settingsQuery.data ? current.value : draft;
      return { source: settingsQuery.data!, value: update(currentDraft) };
    });
    setSavedMessage("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSchedule || !draft || !canSave) return;

    try {
      await updateSettings.mutateAsync(draft);
      setDraftOverride(null);
      setSavedMessage("Đã lưu giờ hoạt động, công suất và phí chăm giữ.");
    } catch {
      // Mutation error is shown inline in the editor.
    }
  };

  const handleAddHoliday = () => {
    if (!holidayDraft || draft?.holidays.includes(holidayDraft)) return;
    updateDraft((current) => ({
      ...current,
      holidays: [...current.holidays, holidayDraft].sort(),
    }));
    setHolidayDraft("");
  };

  const handleRemoveHoliday = (date: string) => {
    updateDraft((current) => ({
      ...current,
      holidays: current.holidays.filter((holiday) => holiday !== date),
    }));
  };

  const applyDefaultSpaHours = () => {
    updateDraft((current) => ({
      ...current,
      openHours: Object.fromEntries(
        WEEKDAYS.map(({ key }) => [key, { open: "08:30", close: "18:30" }]),
      ),
    }));
    setSavedMessage("Đã điền giờ Spa mặc định vào bản nháp. Bấm Lưu cấu hình để áp dụng.");
  };

  return {
    applyDefaultSpaHours,
    canSave,
    canManageSchedule,
    draft,
    handleAddHoliday,
    handleRemoveHoliday,
    handleSave,
    invalidHours,
    isDirty,
    isFetching: settingsQuery.isFetching,
    isError: settingsQuery.isError,
    isLoading: settingsQuery.isLoading,
    hasDefaultSpaHours,
    isSaving: updateSettings.isPending,
    loadErrorMessage: settingsQuery.isError ? getErrorMessage(settingsQuery.error) : undefined,
    openDays,
    refresh: settingsQuery.refetch,
    refreshDisabled: isDirty,
    saveErrorMessage: updateSettings.isError ? getErrorMessage(updateSettings.error) : undefined,
    savedMessage,
    weekdays: WEEKDAYS,
    holidayDraft,
    onCapacityChange: (capacity: number) => updateDraft((current) => ({ ...current, capacity })),
    onLatePickupFeeAmountChange: (latePickupFeeAmount: number) => updateDraft((current) => ({
      ...current,
      latePickupFeeAmount,
    })),
    onCloseChange: (key: string, value: string) => updateDraft((current) => ({
      ...current,
      openHours: {
        ...current.openHours,
        [key]: { ...(current.openHours[key] ?? { open: "08:30" }), close: value },
      },
    })),
    onOpenChange: (key: string, value: string) => updateDraft((current) => ({
      ...current,
      openHours: {
        ...current.openHours,
        [key]: { ...(current.openHours[key] ?? { close: "18:30" }), open: value },
      },
    })),
    onToggleDay: (key: string, isOpen: boolean) => updateDraft((current) => ({
      ...current,
      openHours: {
        ...current.openHours,
        [key]: isOpen ? (current.openHours[key] ?? { open: "08:30", close: "18:30" }) : null,
      },
    })),
    setHolidayDraft,
  };
}
