import { Award, Clock3, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import type { LoyaltyTransaction } from "@/hooks/use-loyalty";

interface LoyaltyHistoryCardProps {
  transactions?: LoyaltyTransaction[];
  isLoading: boolean;
  isError: boolean;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function LoyaltyHistoryCard({
  transactions,
  isLoading,
  isError,
  title = "Lịch sử cộng/trừ điểm",
  emptyMessage = "Chưa có giao dịch điểm nào.",
  className = "",
}: LoyaltyHistoryCardProps) {
  return (
    <section className={`rounded-2xl border border-[#E8E5DE] bg-white p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-3 border-b border-[#E8E5DE] pb-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#E8F4F5] text-[#1D7980]">
          <Award className="size-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1A1F1E]">{title}</h3>
          <p className="text-xs text-[#66706E]">Giao dịch mới nhất hiển thị trước</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#66706E]">
          <Loader2 className="size-4 animate-spin text-[#1D7980]" /> Đang tải lịch sử điểm...
        </div>
      ) : isError ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
          Không tải được lịch sử điểm. Vui lòng thử lại sau.
        </p>
      ) : !transactions?.length ? (
        <div className="py-8 text-center text-xs text-[#66706E]">{emptyMessage}</div>
      ) : (
        <ul className="divide-y divide-[#F2EFE9]">
          {transactions.map((transaction) => {
            const earned = transaction.type === "EARN";
            const manualAdjustmentPrefixes = ["[Nội bộ điều chỉnh]", "[Admin điều chỉnh]"];
            const manualAdjustmentPrefix = manualAdjustmentPrefixes.find((prefix) =>
              transaction.description.startsWith(prefix),
            );
            const isManualAdjustment = !!manualAdjustmentPrefix;
            const description = manualAdjustmentPrefix
              ? transaction.description.slice(manualAdjustmentPrefix.length).trim()
              : transaction.description;
            return (
              <li key={transaction.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                    earned ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                  aria-hidden="true"
                >
                  {earned ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-semibold text-[#1A1F1E]">
                    {isManualAdjustment ? "Điều chỉnh điểm thủ công" : description}
                  </p>
                  {isManualAdjustment && description && (
                    <p className="mt-0.5 break-words text-xs text-[#66706E]">Lý do: {description}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#66706E]">
                    <Clock3 className="size-3" />
                    {new Date(transaction.createdAt).toLocaleString("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    earned ? "text-emerald-700" : "text-rose-700"
                  }`}
                  aria-label={`${earned ? "Cộng" : "Trừ"} ${Math.abs(transaction.amount)} điểm`}
                >
                  {earned ? "+" : "−"}{Math.abs(transaction.amount).toLocaleString("vi-VN")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
