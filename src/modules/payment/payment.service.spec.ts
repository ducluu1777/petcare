import { describe, expect, it } from 'vitest';
import { PaymentService } from './payment.service.js';

function createService(webhookSecret: string, mainAccountNumber = '') {
  const values: Record<string, string> = {
    SEPAY_BANK_CODE: 'VCB',
    SEPAY_BANK_NAME: 'Vietcombank',
    SEPAY_ACCOUNT_NUMBER: 'VQR123456789',
    SEPAY_ACCOUNT_NAME: 'PETCARE',
    SEPAY_WEBHOOK_SECRET: webhookSecret,
    SEPAY_MAIN_ACCOUNT_NUMBER: mainAccountNumber,
  };
  return new PaymentService({ get: (key: string) => values[key] } as never);
}

describe('PaymentService.getSepayAccountConfig', () => {
  it('does not expose an active QR configuration until webhook verification is configured', () => {
    expect(createService('').getSepayAccountConfig('ORDER')).toMatchObject({
      configured: false,
      bankCode: null,
      accountNumber: null,
    });
  });

  it('returns the shared receiving account once the SePay webhook secret is set', () => {
    expect(createService('secret').getSepayAccountConfig('BOOKING')).toMatchObject({
      channel: 'BOOKING',
      configured: true,
      bankCode: 'VCB',
      accountNumber: 'VQR123456789',
      accountName: 'PETCARE',
    });
  });

  it('uses the VA for QR while validating webhook account and sub-account separately', () => {
    const service = createService('secret', '0123456789');

    expect(service.getSepayAccountConfig('ORDER').accountNumber).toBe('VQR123456789');
    expect(service.getSepayWebhookAccountConfig()).toEqual({
      accountNumber: '0123456789',
      subAccount: 'VQR123456789',
    });
  });

  it('does not treat template account values as a ready QR configuration', () => {
    const values: Record<string, string> = {
      SEPAY_BANK_CODE: 'VCB',
      SEPAY_BANK_NAME: 'Vietcombank',
      SEPAY_ACCOUNT_NUMBER: '<số tài khoản>',
      SEPAY_ACCOUNT_NAME: '<tên chủ tài khoản>',
      SEPAY_WEBHOOK_SECRET: 'secret',
    };
    const service = new PaymentService({ get: (key: string) => values[key] } as never);

    expect(service.getSepayAccountConfig('ORDER')).toMatchObject({
      configured: false,
      accountNumber: null,
      accountName: null,
    });
  });
});
