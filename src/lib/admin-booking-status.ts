const BOOKING_STATUS_LABELS: Record<string, string> = {
  BOOKED: "Đã đặt",
  PENDING: "Đã đặt",
  CONFIRMED: "Đã đặt",
  WAITING_CHECKIN: "Đã đặt",
  ARRIVED: "Đã tiếp nhận",
  IN_SERVICE: "Đang chăm sóc",
  IN_PROGRESS: "Đang chăm sóc",
  READY_FOR_PICKUP: "Chờ khách nhận",
  DONE: "Hoàn tất",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};

export function getAdminBookingStatusLabel(status: string | null | undefined) {
  return status ? BOOKING_STATUS_LABELS[status] ?? "Đang cập nhật" : "Đang cập nhật";
}
