export type SepayChannel = "BOOKING" | "ORDER";

export interface SepayAccountConfig {
  channel: SepayChannel;
  configured: boolean;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
}
