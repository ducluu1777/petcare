import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Select, SelectTrigger, SelectValue } from "./select";

function label(markup: string) {
  return markup.match(/data-slot="select-value"[^>]*>(.*?)<\/span>/s)?.[1];
}

describe("Select label boundary", () => {
  it("does not show an enum missing from the record of labels", () => {
    expect(label(renderToStaticMarkup(<Select value="ACTIVE" items={{ INACTIVE: "Ngừng bán" }}><SelectTrigger><SelectValue /></SelectTrigger></Select>))).toBe("Lựa chọn không còn khả dụng");
  });

  it("does not show a removed ID missing from dynamic options", () => {
    expect(label(renderToStaticMarkup(<Select value="removed-id" items={[{ value: "current-id", label: "Bông" }]}><SelectTrigger><SelectValue /></SelectTrigger></Select>))).toBe("Lựa chọn không còn khả dụng");
  });

  it("does not resolve prototype keys as display labels", () => {
    expect(label(renderToStaticMarkup(<Select value="toString" items={{ ACTIVE: "Đang bán" }}><SelectTrigger><SelectValue /></SelectTrigger></Select>))).toBe("Lựa chọn không còn khả dụng");
  });

  it("keeps the placeholder when no value is selected", () => {
    expect(label(renderToStaticMarkup(<Select value={null} items={{ ACTIVE: "Đang bán" }}><SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger></Select>))).toBe("Chọn trạng thái");
  });

  it("keeps readable labels and a safe unknown label in multiple selection", () => {
    const displayed = label(renderToStaticMarkup(<Select multiple value={["ACTIVE", "REMOVED"]} items={{ ACTIVE: "Đang bán" }}><SelectTrigger><SelectValue /></SelectTrigger></Select>));
    expect(displayed?.replace(/<!--.*?-->/g, "")).toBe("Đang bán, Lựa chọn không còn khả dụng");
  });

  it("resolves a zero value instead of treating it as no selection", () => {
    expect(label(renderToStaticMarkup(<Select value={0} items={[{ value: 0, label: "Miễn phí" }]}><SelectTrigger><SelectValue /></SelectTrigger></Select>))).toBe("Miễn phí");
  });

  it("uses the supplied comparator for object values", () => {
    const markup = renderToStaticMarkup(<Select value={{ id: "pet-1" }} items={[{ value: { id: "pet-1" }, label: "Bông" }]} isItemEqualToValue={(left, right) => left.id === right.id}><SelectTrigger><SelectValue /></SelectTrigger></Select>);
    expect(label(markup)).toBe("Bông");
  });
});
