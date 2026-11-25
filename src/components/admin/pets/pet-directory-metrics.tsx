import { AlertTriangle, Calendar, Dog, ShieldCheck } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";

interface PetDirectoryMetricsProps {
  isUnavailable: boolean;
  petCount: number;
  dogCount: number;
  catCount: number;
  warningCount: number;
  vaccinatedCount: number;
  averageBookings: string | number;
}

export function PetDirectoryMetrics({
  isUnavailable,
  petCount,
  dogCount,
  catCount,
  warningCount,
  vaccinatedCount,
  averageBookings,
}: PetDirectoryMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <AdminMetricCard
        label="Tổng thú cưng"
        value={isUnavailable ? "—" : petCount}
        icon={<Dog className="size-5" />}
        tone="primary"
        detail={isUnavailable ? "Số liệu tạm thời chưa khả dụng" : `${dogCount} chó · ${catCount} mèo`}
      />
      <AdminMetricCard
        label="Có lưu ý hành vi"
        value={isUnavailable ? "—" : warningCount}
        icon={<AlertTriangle className="size-5" />}
        tone="neutral"
        detail={isUnavailable ? "Số liệu tạm thời chưa khả dụng" : "Xem trước khi tiếp nhận"}
      />
      <AdminMetricCard
        label="Đã đánh dấu tiêm phòng"
        value={isUnavailable ? "—" : `${vaccinatedCount} / ${petCount}`}
        icon={<ShieldCheck className="size-5" />}
        tone="success"
        detail={isUnavailable
          ? "Số liệu tạm thời chưa khả dụng"
          : `${petCount > 0 ? Math.round((vaccinatedCount / petCount) * 100) : 0}% hồ sơ`}
      />
      <AdminMetricCard
        label="Số lịch trung bình"
        value={isUnavailable ? "—" : `${averageBookings} lịch`}
        icon={<Calendar className="size-5" />}
        tone="neutral"
        detail={isUnavailable ? "Số liệu tạm thời chưa khả dụng" : "Trên mỗi hồ sơ thú cưng"}
      />
    </div>
  );
}
