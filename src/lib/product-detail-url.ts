export function getProductDetailHref(slug: string): string {
  return `/cua-hang/${encodeURIComponent(slug)}`;
}

export function getProductLoginHref(slug: string): string {
  const redirect = encodeURIComponent(getProductDetailHref(slug));
  return `/dang-nhap?redirect=${redirect}`;
}
