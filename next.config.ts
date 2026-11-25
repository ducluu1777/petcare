import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from the local network during testing.
  allowedDevOrigins: ["192.168.1.184"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.vietqr.io",
        pathname: "/image/**",
      },
      {
        protocol: "https",
        hostname: "vietqr.app",
        pathname: "/img",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/services", destination: "/dich-vu", permanent: false },
      { source: "/services/:slug", destination: "/dich-vu/:slug", permanent: false },
      { source: "/booking", destination: "/dat-lich", permanent: false },
      { source: "/ai-stylist", destination: "/tao-kieu-ai", permanent: false },
      { source: "/shop", destination: "/cua-hang", permanent: false },
      { source: "/shop/:id", destination: "/cua-hang/:id", permanent: false },
      { source: "/cart", destination: "/gio-hang", permanent: false },
      { source: "/profile", destination: "/tai-khoan", permanent: false },
      { source: "/login", destination: "/dang-nhap", permanent: false },
      { source: "/register", destination: "/dang-ky", permanent: false },
    ];
  },
};

export default nextConfig;
