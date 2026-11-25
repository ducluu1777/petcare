export type DisplayLabelDomain = "serviceCategory" | "userRole" | "contactTopic" | "contactStatus" | "aiReason" | "aiSource" | "sepayReason" | "auditAction";

const LABELS: Record<DisplayLabelDomain, Readonly<Record<string, string>>> = {
  serviceCategory: {
    BATH: "Tắm Spa", GROOMING: "Cắt tỉa và tạo kiểu", CAT_SPA: "Spa cho mèo",
  },
  userRole: { ADMIN: "Quản trị viên", STAFF: "Nhân viên", CUSTOMER: "Khách hàng" },
  contactTopic: {
    "tu-van-spa": "Tư vấn dịch vụ Spa", "doi-huy-lich": "Đổi hoặc hủy lịch", "phan-hoi": "Góp ý sau dịch vụ", khac: "Nội dung khác",
  },
  contactStatus: { NEW: "Mới", IN_PROGRESS: "Đang xử lý", RESOLVED: "Đã giải quyết" },
  aiReason: {
    daily_request_limit: "Đã đạt hạn mức AI hôm nay",
    missing_api_key: "Chưa cấu hình khóa AI",
    rate_limit: "AI đang giới hạn yêu cầu",
    provider_error: "Dịch vụ AI gặp lỗi",
    empty_response: "AI chưa trả về nội dung",
    tool_limit_exceeded: "Đã đạt giới hạn tra cứu",
  },
  aiSource: { model: "Mô hình AI", fallback: "Phản hồi dự phòng" },
  sepayReason: {
    UNKNOWN_CODE: "Không tìm thấy mã thanh toán",
    WRONG_ACCOUNT: "Sai tài khoản nhận tiền",
    WRONG_SUB_ACCOUNT: "Sai tài khoản phụ nhận tiền",
    WRONG_CODE: "Sai mã thanh toán",
    NOT_INCOMING: "Không phải giao dịch tiền vào",
    ORDER_NOT_PAYABLE: "Đơn đã thanh toán, đã hủy hoặc không còn nhận thanh toán",
    OVERDUE: "Chuyển sau hạn thanh toán",
    AMOUNT_MISMATCH: "Số tiền không khớp",
    REFERENCE_ALREADY_USED: "Mã giao dịch ngân hàng đã được sử dụng",
    ORDER_CHANGED: "Đơn vừa thay đổi trạng thái khi nhận tiền",
    INTENT_NOT_PAYABLE: "Mã thanh toán đã xử lý hoặc hết hiệu lực",
    PAYMENT_CHANGED: "Khoản thanh toán vừa thay đổi, cần kiểm tra",
  },
  auditAction: {
    ADMIN_UPDATE_PROFILE: "Cập nhật hồ sơ khách hàng",
    UPDATE_PROFILE: "Cập nhật hồ sơ khách hàng",
    SOFT_DELETE: "Xóa tạm thời tài khoản",
    RESTORE_ACCOUNT: "Khôi phục tài khoản khách hàng",
    ADJUST_LOYALTY_POINTS: "Điều chỉnh điểm tích lũy",
    UPDATE_USER_ROLE: "Thay đổi vai trò tài khoản",
    UPDATE_USER_STATUS: "Thay đổi trạng thái tài khoản",
  },
};

const FALLBACKS: Record<DisplayLabelDomain, string> = {
  serviceCategory: "Dịch vụ chăm sóc",
  userRole: "Vai trò chưa xác định",
  contactTopic: "Nội dung khác",
  contactStatus: "Đang cập nhật",
  aiReason: "Cần kiểm tra lượt xử lý AI",
  aiSource: "Nguồn phản hồi khác",
  sepayReason: "Cần kiểm tra giao dịch",
  auditAction: "Cập nhật tài khoản",
};

export function getDisplayLabel(domain: DisplayLabelDomain, value?: string | null): string {
  const key = value?.trim();
  const labels = LABELS[domain];
  return key && Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : FALLBACKS[domain];
}
