import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("notification panel stays within the mobile viewport", async () => {
  const component = await readFile(new URL("./NotificationBell.tsx", import.meta.url), "utf8");

  expect(component).toMatch(/fixed[^"]*inset-x-3[^"]*top-\[5\.5rem\][^"]*w-auto/);
  expect(component).toMatch(/sm:absolute[^"]*sm:inset-x-auto[^"]*sm:right-0[^"]*sm:top-full[^"]*sm:w-96/);
  expect(component).toContain("max-h-[calc(100dvh-6.5rem)]");
});
