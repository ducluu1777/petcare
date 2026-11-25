import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;

  const token = request.cookies.get("petcare_token")?.value;
  const role = request.cookies.get("petcare_role")?.value;

  // 1. Phân hệ Admin & Staff: Bắt buộc đăng nhập với role ADMIN hoặc STAFF
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/dang-nhap-admin", request.url);
      loginUrl.searchParams.set("redirect", fullPath);
      return NextResponse.redirect(loginUrl);
    }

    if (role === "CUSTOMER") {
      // Khách hàng thông thường không được phép truy cập phân hệ quản trị
      return NextResponse.redirect(new URL("/tai-khoan", request.url));
    }
  }

  // 2. Phân hệ Tài khoản Cá nhân, Đặt Lịch, Giỏ Hàng: Bắt buộc đăng nhập
  if (pathname.startsWith("/tai-khoan") || pathname.startsWith("/dat-lich") || pathname.startsWith("/gio-hang")) {
    if (!token) {
      const loginUrl = new URL("/dang-nhap", request.url);
      loginUrl.searchParams.set("redirect", fullPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/tai-khoan/:path*",
    "/dat-lich/:path*",
    "/gio-hang/:path*",
    "/dang-nhap",
    "/dang-ky",
  ],
};
