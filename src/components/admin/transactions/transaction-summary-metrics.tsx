import { Banknote, CreditCard, QrCode, Receipt } from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";

interface TransactionSummaryMetricsProps {
  isLoading: boolean;
  isError: boolean;
  totalRevenue: number;
  qrRevenue: number;
  cashRevenue: number;
  transactionCount: number;
  qrCount: number;
  cashCount: number;
  periodLabel: string;
}

export function TransactionSummaryMetrics({
  isLoading,
  isError,
  totalRevenue,
  qrRevenue,
  cashRevenue,
  transactionCount,
  qrCount,
  cashCount,
  periodLabel,
}: TransactionSummaryMetricsProps) {
  const revenueValue = (amount: number) =>
    isLoading ? "Đang tải…" : isError ? "—" : `${amount.toLocaleString("vi-VN")}₫`;
  const unavailableDetail = isLoading || isError ? "Số liệu tạm thời chưa khả dụng" : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      <AdminMetricCard
        label="Tổng thực thu trong kỳ"
        value={revenueValue(totalRevenue)}
        icon={<Receipt className="size-5" />}
        tone="primary"
        detail={unavailableDetail ?? `${transactionCount} giao dịch · ${periodLabel}`}
      />
      <AdminMetricCard
        label="Thực thu qua QR trong kỳ"
        value={revenueValue(qrRevenue)}
        icon={<QrCode className="size-5" />}
        tone="primary"
        detail={unavailableDetail ?? `${qrCount} giao dịch`}
      />
      <AdminMetricCard
        label="Thực thu tiền mặt trong kỳ"
        value={revenueValue(cashRevenue)}
        icon={<Banknote className="size-5" />}
        tone="success"
        detail={unavailableDetail ?? `${cashCount} giao dịch`}
      />
      <AdminMetricCard
        label="Giao dịch trong kỳ"
        value={isLoading ? "Đang tải…" : isError ? "—" : transactionCount}
        icon={<CreditCard className="size-5" />}
        tone="neutral"
        detail={isLoading ? "Đang tải giao dịch…" : isError ? "Không tải được giao dịch." : `Theo ngày Việt Nam · ${periodLabel}`}
      />
    </div>
  );
}
