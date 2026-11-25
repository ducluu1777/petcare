import { LoyaltyHistoryCard } from "@/components/loyalty/loyalty-history-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoyaltyTransaction } from "@/hooks/use-loyalty";
import { Award } from "lucide-react";

interface UserLoyaltySectionProps {
  points: number;
  history: LoyaltyTransaction[] | undefined;
  isHistoryLoading: boolean;
  isHistoryError: boolean;
  adjustmentInput: string;
  adjustmentReason: string;
  isAdjusting: boolean;
  onAdjust: () => void;
  onAdjustmentInputChange: (value: string) => void;
  onAdjustmentReasonChange: (value: string) => void;
}

export function UserLoyaltySection({
  points,
  history,
  isHistoryLoading,
  isHistoryError,
  adjustmentInput,
  adjustmentReason,
  isAdjusting,
  onAdjust,
  onAdjustmentInputChange,
  onAdjustmentReasonChange,
}: UserLoyaltySectionProps) {
  const parsedAdjustment = Number(adjustmentInput);
  const hasValidAdjustment =
    adjustmentInput.trim() !== "" && Number.isInteger(parsedAdjustment) && parsedAdjustment !== 0;

  return (
    <>
      <section className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-teal-900">Số dư điểm tích lũy</span>
          <Award className="h-4 w-4 text-teal-700" />
        </div>
        <div className="text-2xl font-bold tabular-nums text-teal-900">
          {points.toLocaleString()} <span className="text-xs font-medium">điểm</span>
        </div>
        <div className="text-xs text-teal-700">
          Mỗi 10.000đ thực thu sau giảm giá được cộng 1 điểm. Điểm chỉ dùng để đổi voucher.
        </div>

        <div className="space-y-2 border-t border-teal-200/80 pt-3">
          <div className="text-sm font-bold text-teal-950">Điều chỉnh điểm tích lũy thủ công</div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="loyalty-adjustment-points" className="block text-sm font-semibold text-teal-950">
                Số điểm điều chỉnh
              </label>
              <Input
                id="loyalty-adjustment-points"
                type="number"
                step={1}
                aria-invalid={adjustmentInput.trim() !== "" && !hasValidAdjustment}
                aria-describedby="loyalty-adjustment-points-help"
                placeholder="Ví dụ: 10 hoặc -5"
                value={adjustmentInput}
                onChange={(event) => onAdjustmentInputChange(event.target.value)}
                className="rounded-lg border border-teal-300 bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink focus-visible:border-admin-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary"
              />
              <p
                id="loyalty-adjustment-points-help"
                className={`text-xs ${adjustmentInput.trim() !== "" && !hasValidAdjustment ? "text-red-700" : "text-teal-700"}`}
              >
                {adjustmentInput.trim() !== "" && !hasValidAdjustment
                  ? "Nhập số nguyên khác 0."
                  : "Số dương để cộng, số âm để trừ."}
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isAdjusting || !hasValidAdjustment || !adjustmentReason.trim()}
              onClick={onAdjust}
              className="h-10 rounded-lg bg-primary px-3 text-sm font-bold text-white shadow-2xs transition-all hover:brightness-105 disabled:opacity-50"
            >
              {isAdjusting ? "Đang lưu..." : "Lưu điều chỉnh"}
            </Button>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="loyalty-adjustment-reason" className="block text-sm font-semibold text-teal-950">
              Lý do điều chỉnh <span className="font-medium text-teal-700">(bắt buộc)</span>
            </label>
            <Input
              id="loyalty-adjustment-reason"
              type="text"
              required
              value={adjustmentReason}
              onChange={(event) => onAdjustmentReasonChange(event.target.value)}
              aria-describedby="loyalty-adjustment-reason-help"
              className="w-full rounded-lg border border-teal-300 bg-surface px-2.5 py-1.5 text-sm text-ink focus-visible:border-admin-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary"
            />
            <p id="loyalty-adjustment-reason-help" className="text-xs text-teal-700">
              Lý do được lưu cùng lịch sử cộng/trừ điểm.
            </p>
          </div>
        </div>
      </section>

      <LoyaltyHistoryCard
        transactions={history}
        isLoading={isHistoryLoading}
        isError={isHistoryError}
        title="Lịch sử cộng/trừ điểm"
        emptyMessage="Khách hàng chưa có giao dịch điểm nào."
      />
    </>
  );
}
