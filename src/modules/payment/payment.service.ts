import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SepayChannel = 'BOOKING' | 'ORDER';

export interface SepayAccountConfig {
  channel: SepayChannel;
  configured: boolean;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
}

export interface SepayWebhookAccountConfig {
  accountNumber: string;
  subAccount: string | null;
}

function isConfiguredValue(value: string): boolean {
  return Boolean(value && !/^<[^<>]+>$/.test(value) && !/^(TODO|CHANGE_ME|YOUR_.+)$/i.test(value));
}

@Injectable()
export class PaymentService {
  constructor(private readonly configService: ConfigService) {}

  getSepayAccountConfig(channelValue: string): SepayAccountConfig {
    if (channelValue !== 'BOOKING' && channelValue !== 'ORDER') {
      throw new BadRequestException('Kênh thanh toán không hợp lệ.');
    }

    const channel: SepayChannel = channelValue;
    const prefix = 'SEPAY';
    const bankCode = this.configService.get<string>(`${prefix}_BANK_CODE`)?.trim() || '';
    const bankName = this.configService.get<string>(`${prefix}_BANK_NAME`)?.trim() || '';
    const accountNumber = this.configService.get<string>(`${prefix}_ACCOUNT_NUMBER`)?.replace(/\s/g, '') || '';
    const accountName = this.configService.get<string>(`${prefix}_ACCOUNT_NAME`)?.trim() || '';
    const webhookSecret = this.configService.get<string>('SEPAY_WEBHOOK_SECRET')?.trim() || '';
    const configured = [bankCode, bankName, accountNumber, accountName, webhookSecret].every(isConfiguredValue);

    return {
      channel,
      configured,
      bankCode: configured ? bankCode : null,
      bankName: configured ? bankName : null,
      accountNumber: configured ? accountNumber : null,
      accountName: configured ? accountName : null,
    };
  }

  getSepayWebhookAccountConfig(): SepayWebhookAccountConfig {
    const qrAccountNumber = this.configService.get<string>('SEPAY_ACCOUNT_NUMBER')?.replace(/\s/g, '') || '';
    const mainAccountNumber = this.configService.get<string>('SEPAY_MAIN_ACCOUNT_NUMBER')?.replace(/\s/g, '') || '';

    return {
      accountNumber: mainAccountNumber || qrAccountNumber,
      subAccount: mainAccountNumber ? qrAccountNumber : null,
    };
  }

}
