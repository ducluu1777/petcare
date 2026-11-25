import type { SepayAccountConfig } from "@/lib/payment-config";

export function buildVietQrImageUrl(
  recipient: SepayAccountConfig | undefined,
  amount: number,
  transferContent: string,
): string | null {
  if (
    !recipient?.configured ||
    !recipient.bankCode ||
    !recipient.accountNumber ||
    !recipient.accountName ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  const params = new URLSearchParams({
    acc: recipient.accountNumber,
    bank: recipient.bankCode,
    amount: String(Math.round(amount)),
    des: transferContent,
    template: "compact",
    holder: recipient.accountName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D"),
  });

  return `https://vietqr.app/img?${params.toString()}`;
}
