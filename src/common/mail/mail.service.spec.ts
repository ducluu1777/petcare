import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransport, sendMail, verify } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('nodemailer', () => ({ createTransport }));

import { MailService } from './mail.service.js';

describe('MailService verification email', () => {
  const config = { get: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'MAIL_USER') return 'petcare@example.com';
      if (key === 'MAIL_PASS') return 'test-password';
      return undefined;
    });
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    verify.mockResolvedValue(true);
    createTransport.mockReturnValue({ sendMail, verify });
  });

  it('uses Gmail SMTP over TLS with normalized App Password credentials', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'MAIL_USER') return ' sender@gmail.com ';
      if (key === 'MAIL_PASS') return 'abcd efgh ijkl mnop';
      return undefined;
    });
    sendMail.mockResolvedValue({});
    const service = new MailService(config as any);

    await service.sendVerificationCode('demo@example.com', '654321', 'Demo');

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'sender@gmail.com', pass: 'abcdefghijklmnop' },
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: '"PetCare" <sender@gmail.com>',
    }));
  });

  it('checks SMTP authentication without sending a message', async () => {
    const service = new MailService(config as any);

    await service.verifyConnection();

    expect(verify).toHaveBeenCalledOnce();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('does not connect when SMTP credentials contain only whitespace', async () => {
    config.get.mockReturnValue('   ');
    const service = new MailService(config as any);

    await expect(service.verifyConnection()).rejects.toThrow('MAIL_USER');
    await expect(service.sendVerificationCode('demo@example.com', '654321', 'Demo'))
      .rejects.toThrow(ServiceUnavailableException);
    expect(verify).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('reports failed delivery without logging the OTP', async () => {
    const service = new MailService(config as any);
    const warning = vi.spyOn((service as any).logger, 'warn');

    await expect(
      service.sendVerificationCode('demo@example.com', '654321', 'Demo'),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(warning).toHaveBeenCalledWith(expect.not.stringContaining('654321'));
  });

  it('rejects verification requests when SMTP credentials are missing', async () => {
    config.get.mockReturnValue(undefined);
    const service = new MailService(config as any);

    await expect(
      service.sendVerificationCode('demo@example.com', '654321', 'Demo'),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
