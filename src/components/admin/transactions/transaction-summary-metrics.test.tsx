import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TransactionSummaryMetrics } from "./transaction-summary-metrics";

describe("TransactionSummaryMetrics", () => {
  it("keeps long revenue values on a full-width row at mobile widths", () => {
    const markup = renderToStaticMarkup(
      <TransactionSummaryMetrics
        isLoading={false}
        isError={false}
        totalRevenue={405500}
        qrRevenue={0}
        cashRevenue={405500}
        transactionCount={4}
        qrCount={0}
        cashCount={4}
        periodLabel="23/10/2026"
      />,
    );

    expect(markup).toContain("grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4");
    expect(markup).toContain("405.500₫");
  });
});
