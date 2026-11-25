export type TransactionSource = "BOOKING" | "ONLINE_ORDER" | "IN_STORE" | "OTHER";

export interface TransactionRecord {
  id: string;
  referenceCode: string;
  relatedCode: string;
  source: TransactionSource;
  sourceLabel: string;
  customerName: string;
  contentDescription: string;
  amount: number;
  receivedAmount?: number | null;
  note?: string | null;
  confirmedByName?: string | null;
  type: "DEPOSIT" | "FINAL_PAYMENT" | "ADDON" | "REFUND";
  method: "VIETQR" | "CASH";
  proofUrl?: string | null;
  transactedAt: string;
  createdAt: string;
  recordSource: string;
}
