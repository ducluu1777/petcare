import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("customer login page does not expose the internal admin login", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  expect(page).not.toContain('href="/dang-nhap-admin"');
  expect(page).not.toContain("Đăng nhập nội bộ");
});
