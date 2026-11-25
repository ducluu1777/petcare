import { describe, expect, it } from "bun:test";
import { getDisplayLabel, type DisplayLabelDomain } from "./domain-labels";

describe("Human-readable labels across PetCare", () => {
  it.each([
    ["serviceCategory", "BATH", "Tắm Spa"],
    ["serviceCategory", "GROOMING", "Cắt tỉa và tạo kiểu"],
    ["serviceCategory", "CAT_SPA", "Spa cho mèo"],
    ["userRole", "ADMIN", "Quản trị viên"],
    ["userRole", "STAFF", "Nhân viên"],
    ["userRole", "CUSTOMER", "Khách hàng"],
    ["contactTopic", "doi-huy-lich", "Đổi hoặc hủy lịch"],
    ["contactTopic", "tu-van-spa", "Tư vấn dịch vụ Spa"],
    ["contactTopic", "phan-hoi", "Góp ý sau dịch vụ"],
    ["contactStatus", "NEW", "Mới"],
    ["contactStatus", "IN_PROGRESS", "Đang xử lý"],
    ["contactStatus", "RESOLVED", "Đã giải quyết"],
    ["aiReason", "rate_limit", "AI đang giới hạn yêu cầu"],
    ["aiReason", "tool_limit_exceeded", "Đã đạt giới hạn tra cứu"],
    ["aiSource", "fallback", "Phản hồi dự phòng"],
    ["aiSource", "model", "Mô hình AI"],
    ["sepayReason", "WRONG_SUB_ACCOUNT", "Sai tài khoản phụ nhận tiền"],
    ["sepayReason", "AMOUNT_MISMATCH", "Số tiền không khớp"],
    ["auditAction", "UPDATE_USER_ROLE", "Thay đổi vai trò tài khoản"],
  ] satisfies Array<[DisplayLabelDomain, string, string]>)("shows %s / %s as %s", (domain, value, expected) => {
    expect(getDisplayLabel(domain, value)).toBe(expected);
  });

  it.each(["serviceCategory", "userRole", "contactTopic", "contactStatus", "aiReason", "aiSource", "sepayReason", "auditAction"] satisfies DisplayLabelDomain[])("never exposes unknown codes or object properties in %s", (domain) => {
    for (const value of ["NEW_UNKNOWN_ENUM", "toString", "__proto__", "", null, undefined]) {
      const label = getDisplayLabel(domain, value);
      expect(typeof label).toBe("string");
      expect(label).not.toContain("NEW_UNKNOWN_ENUM");
      expect(label).not.toContain("toString");
      expect(label).not.toContain("__proto__");
      expect(label).not.toContain(domain);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
