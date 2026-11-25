import type { BookingItem } from "@/hooks/use-bookings";
import { vietnamDateKey } from "@/lib/calendar-date-utils";

export type AdminBookingStatus =
  | "WAITING_CHECKIN"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  note?: string;
  isAddon?: boolean;
  serviceId?: string;
}

export interface BookingRecord {
  id: string;
  code: string;
  date: string;
  type: "SPA";
  source: BookingItem["source"];
  spaBookingPromotionEligible: boolean;
  latePickupFeeAmount: number;
  latePickupFeePaid: boolean;
  customer: {
    name: string;
    phone: string;
    loyaltyPointsLabel: string;
    loyaltyPoints?: number;
  };
  pet: {
    id?: string;
    name: string;
    breed: string;
    species: "Chó" | "Mèo" | "Chưa xác định";
    weight: number | null;
    age: string;
    allergies: string;
    behavioralFlag?: "NORMAL" | "AGGRESSIVE" | "TIMID";
  };
  service: {
    title: string;
    category: string;
    assignedStaff: string;
    timeRange?: string;
    scheduledTime: string;
    items: ServiceItem[];
  };
  financial: {
    subtotal: number;
    discount: number;
    finalAmount: number;
    serviceRemainingAmount: number;
    remainingAmount: number;
    paymentStatus: "UNPAID" | "PAID";
    paidMethod?: "Chuyển khoản" | "Tiền mặt";
  };
  status: AdminBookingStatus;
  statusV2: BookingItem["statusV2"];
  weightRecheckAcceptedForArrival?: boolean;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  cancellationTimeSource?: "AUDIT_LOG" | "LAST_UPDATED" | null;
  cancellationReason?: string | null;
  startAt: string | null;
  parentNotes: string;
}

function formatTimeRange(startIso?: string | null, endIso?: string | null): string {
  if (!startIso) return "";
  const start = new Date(startIso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  if (!endIso) return start;
  const end = new Date(endIso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return `${start} - ${end}`;
}

function formatDate(iso?: string | null): string {
  return iso ? vietnamDateKey(new Date(iso)) : vietnamDateKey();
}

export function mapBookingItemToRecord(item: BookingItem): BookingRecord {
  const rawStatus = item.statusV2 || item.status;
  const statusLogs = item.statusLogs ?? [];
  const cancellationLogs = statusLogs.filter((log) => log.toStatus === "CANCELLED");
  const cancellationLog = cancellationLogs
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .at(-1);
  const latestArrivalLog = statusLogs
    .filter((log) => log.toStatus === "ARRIVED" && ["STATUS_CHANGE", "WALK_IN_CREATE"].includes(log.action ?? ""))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .at(-1);
  const weightRecheckActions = [
    "WEIGHT_RECHECK_PENDING",
    "WEIGHT_RECHECK_UNSUPPORTED",
    "WEIGHT_RECHECK_ACCEPTED",
    "WEIGHT_RECHECK_ACCEPTED_FORCE_OVERBOOK",
    "WEIGHT_RECHECK_DECLINED",
  ];
  const latestWeightRecheckLog = statusLogs
    .filter((log) => weightRecheckActions.includes(log.action ?? ""))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .at(-1);
  const acceptedWeight = Number(latestWeightRecheckLog?.meta?.weightKg);
  const currentWeight = Number(item.pet?.weightKg);
  const weightRecheckAcceptedForArrival = Boolean(
    latestWeightRecheckLog &&
      ["WEIGHT_RECHECK_ACCEPTED", "WEIGHT_RECHECK_ACCEPTED_FORCE_OVERBOOK"].includes(latestWeightRecheckLog.action ?? "") &&
      (!latestArrivalLog || latestWeightRecheckLog.createdAt > latestArrivalLog.createdAt) &&
      Number.isFinite(acceptedWeight) &&
      Number.isFinite(currentWeight) &&
      Math.abs(acceptedWeight - currentWeight) <= 0.000001,
  );
  const statusMap: Record<string, AdminBookingStatus> = {
    BOOKED: "WAITING_CHECKIN",
    ARRIVED: "ARRIVED",
    IN_SERVICE: "IN_PROGRESS",
    READY_FOR_PICKUP: "READY_FOR_PICKUP",
    DONE: "COMPLETED",
    NO_SHOW: "NO_SHOW",
    PENDING: "WAITING_CHECKIN",
    CONFIRMED: "WAITING_CHECKIN",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };

  const finalAmount = item.total;
  const latePickupFeeAmount = item.latePickupFeeAmount ?? 0;
  const latePickupFeePaid = Boolean(item.latePickupFeePaidAt) || latePickupFeeAmount <= 0;
  const serviceRemainingAmount = item.isPaid ? 0 : finalAmount;
  const careFeeRemainingAmount = latePickupFeePaid ? 0 : latePickupFeeAmount;
  const remainingAmount = serviceRemainingAmount + careFeeRemainingAmount;
  const petAgeMonths = item.pet?.ageMonths;
  const petAgeLabel =
    petAgeMonths == null ? "Chưa cập nhật tuổi" : petAgeMonths >= 24 ? `${Math.floor(petAgeMonths / 12)} tuổi` : `${petAgeMonths} tháng`;
  const status = statusMap[rawStatus] ?? "WAITING_CHECKIN";

  return {
    id: item.id,
    code: item.code,
    date: item.startAt
      ? formatDate(item.startAt)
      : item.timeSlot?.slotDate
        ? item.timeSlot.slotDate.split("T")[0]
        : item.createdAt
          ? item.createdAt.split("T")[0]
          : vietnamDateKey(),
    type: item.type,
    source: item.source,
    spaBookingPromotionEligible: item.spaBookingPromotionEligible ?? false,
    latePickupFeeAmount,
    latePickupFeePaid,
    customer: {
      name: item.customer?.name || "Chưa có thông tin khách",
      phone: item.customer?.phone || "",
      loyaltyPointsLabel: `${item.customer?.loyaltyPoints ?? 0} điểm`,
      loyaltyPoints: item.customer?.loyaltyPoints || 0,
    },
    pet: {
      id: item.petId || item.pet?.id,
      name: item.pet?.name || "Chưa cập nhật tên",
      breed: item.pet?.breed || "Chưa xác định giống",
      species: item.pet?.species === "CAT" ? "Mèo" : item.pet?.species === "DOG" ? "Chó" : "Chưa xác định",
      weight: item.pet?.weightKg ?? null,
      age: petAgeLabel,
      allergies: item.pet?.notes || "",
      behavioralFlag: item.pet?.behavioralFlag || "NORMAL",
    },
    service: {
      title: item.services?.[0]?.service?.name || "Chưa có thông tin dịch vụ",
      category: "Dịch vụ Spa & chăm sóc",
      assignedStaff: item.assignedStaff?.name || "Chưa phân công",
      timeRange: item.startAt
        ? formatTimeRange(item.startAt, null)
        : item.timeSlot?.slotTime || "Chưa có giờ hẹn",
      scheduledTime: item.startAt
        ? `${formatTimeRange(item.startAt, null)} (${formatDate(item.startAt)})`
        : item.timeSlot
          ? `${item.timeSlot.slotTime} (${item.timeSlot.slotDate.split("T")[0]})`
          : "Chưa có thời gian",
      items: item.services?.map((service) => ({
        id: service.id,
        serviceId: service.serviceId,
        name: service.service?.name || "Dịch vụ",
        price: service.priceApplied,
        isAddon: service.service?.isAddon || false,
      })) || [],
    },
    financial: {
      subtotal: item.subtotal,
      discount: item.discount,
      finalAmount,
      serviceRemainingAmount,
      remainingAmount,
      paymentStatus: remainingAmount > 0 ? "UNPAID" : "PAID",
      paidMethod: item.isPaid
        ? item.transactions?.find((transaction) => transaction.type === "FINAL_PAYMENT")?.paymentMethod === "BANK_TRANSFER"
          ? "Chuyển khoản"
          : "Tiền mặt"
        : undefined,
    },
    status,
    statusV2: item.statusV2 ?? null,
    weightRecheckAcceptedForArrival,
    cancelledById: cancellationLog?.staffId,
    cancelledAt: cancellationLog?.createdAt ?? (status === "CANCELLED" ? item.updatedAt : null),
    cancellationTimeSource: cancellationLog ? "AUDIT_LOG" : status === "CANCELLED" ? "LAST_UPDATED" : null,
    cancellationReason: cancellationLog?.reason?.trim() || null,
    startAt: item.startAt ?? null,
    parentNotes: item.staffNote || "",
  };
}
