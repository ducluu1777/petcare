export function getBookingCancellationReason(reason?: string | null): string {
  const value = reason?.trim();
  if (!value) return "Không cung cấp lý do.";

  const isStatusChangeLog = /^Chuyển trạng thái từ [A-Z_]+ sang CANCELLED\.?$/.test(value);
  const isGeneratedEmptyReason = /^(Khách hàng|Nhân viên) hủy lịch; không cung cấp lý do cụ thể\.$/.test(value);
  return isStatusChangeLog || isGeneratedEmptyReason ? "Không cung cấp lý do." : value;
}
