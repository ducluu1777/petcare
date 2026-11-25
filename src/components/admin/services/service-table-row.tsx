import { Archive, ChevronRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ServiceItem } from "@/hooks/use-services";

const CATEGORY_LABELS: Record<ServiceItem["category"], string> = {
  BATH: "Tắm và sấy",
  GROOMING: "Cắt tỉa lông",
  CAT_SPA: "Chăm sóc chuyên biệt cho mèo",
};

interface ServiceTableRowProps {
  service: ServiceItem;
  isUpdating: boolean;
  onToggleActive: (service: ServiceItem) => void;
  onEdit: (service: ServiceItem) => void;
}

export function ServiceTableRow({ service, isUpdating, onToggleActive, onEdit }: ServiceTableRowProps) {
  const lowestPrice = service.priceTiers.length > 0
    ? Math.min(...service.priceTiers.map((tier) => tier.price))
    : null;

  return (
    <TableRow className="border-border-subtle transition-colors hover:bg-slate-50 group">
      <TableCell className="py-3.5 text-sm font-bold tabular-nums text-ink">
        {service.slug}
      </TableCell>

      <TableCell className="py-3.5">
        <p className="text-sm font-bold text-ink">{service.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-text">
          {service.tagline || service.description || "Chưa có mô tả ngắn"}
        </p>
      </TableCell>

      <TableCell className="py-3.5 text-sm text-slate-700">
        {service.priceTiers.length > 0
          ? `${service.priceTiers.length} bậc theo kg`
          : "Chưa cấu hình bậc"}
      </TableCell>

      <TableCell className="py-3.5 text-sm font-black tabular-nums text-primary">
        {lowestPrice === null
          ? "Chưa cấu hình"
          : lowestPrice === 0
            ? "Miễn phí"
            : `${lowestPrice.toLocaleString("vi-VN")}₫`}
      </TableCell>

      <TableCell className="py-3.5">
        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${
          service.isAddon
            ? "border-purple-200 bg-purple-50 text-purple-700"
            : "border-teal-200 bg-teal-50 text-teal-800"
        }`}>
          {service.isAddon ? "Dịch vụ bổ sung" : CATEGORY_LABELS[service.category]}
        </span>
      </TableCell>

      <TableCell className="py-3.5">
        <div className="space-y-1">
          <Badge variant="outline" className={service.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>
            {service.isActive ? "Đang cung cấp" : "Tạm ngừng"}
          </Badge>
          <p className="text-xs text-muted-text">
            {(service._count?.bookingServices ?? 0) > 0
              ? `Có ${service._count?.bookingServices} lượt đặt`
              : "Chưa có lượt đặt"}
          </p>
        </div>
      </TableCell>

      <TableCell className="py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            onClick={() => onToggleActive(service)}
            variant="ghost"
            size="icon"
            disabled={isUpdating}
            className={`size-10 rounded-lg ${service.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
            aria-label={service.isActive ? `Tạm ngừng dịch vụ ${service.name}` : `Mở lại dịch vụ ${service.name}`}
            title={service.isActive ? "Tạm ngừng dịch vụ" : "Mở lại dịch vụ"}
          >
            {service.isActive
              ? <Archive aria-hidden="true" className="size-4" />
              : <RotateCcw aria-hidden="true" className="size-4" />}
          </Button>
          <Button
            type="button"
            onClick={() => onEdit(service)}
            variant="outline"
            size="icon"
            className="size-10 rounded-lg border-border-subtle text-muted-text hover:bg-slate-100 hover:text-ink"
            aria-label={`Sửa thông tin dịch vụ ${service.name}`}
            title="Sửa thông tin và bảng giá"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
