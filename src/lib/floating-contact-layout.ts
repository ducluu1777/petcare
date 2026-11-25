export function shouldFloatContact(pathname: string | null): boolean {
  return !pathname?.startsWith("/admin");
}
