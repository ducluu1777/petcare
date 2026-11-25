const LABELS: Record<string, string> = {
  PENDING: 'Đã đặt', CONFIRMED: 'Đã đặt', BOOKED: 'Đã đặt', ARRIVED: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang chăm sóc', IN_SERVICE: 'Đang chăm sóc', READY_FOR_PICKUP: 'Chờ khách nhận',
  COMPLETED: 'Hoàn tất', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến',
};

export function getBookingStatusLabel(status: string): string {
  return Object.prototype.hasOwnProperty.call(LABELS, status) ? LABELS[status] : 'Trạng thái chưa xác định';
}
