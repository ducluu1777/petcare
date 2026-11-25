import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

import { AuthService } from './auth.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MailService } from '../../common/mail/mail.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let mailMock: { sendVerificationCode: ReturnType<typeof vi.fn>; sendPasswordResetCode: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mailMock = {
      sendVerificationCode: vi.fn(),
      sendPasswordResetCode: vi.fn(),
    };
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      oAuthAccount: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
            verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1', email: 'test@petcare.vn', role: Role.CUSTOMER }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
              if (key === 'AUTH_DEV_OTP_PREVIEW') return process.env.AUTH_DEV_OTP_PREVIEW;
              return undefined;
            }),
          },
        },
        {
          provide: MailService,
          useValue: mailMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send email OTP when requested', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '1',
      email: 'test@petcare.vn',
      name: 'Test User',
      role: Role.CUSTOMER,
      isActive: true,
      deletedAt: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.sendEmailOtp('test@petcare.vn');
    expect(result.message).toContain('Đã gửi mã xác thực');
    expect(result).not.toHaveProperty('debugCode');
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it('returns the OTP locally and skips email only when dev preview is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_DEV_OTP_PREVIEW', 'true');
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '1',
      email: 'test@petcare.vn',
      name: 'Test User',
      role: Role.CUSTOMER,
      isActive: true,
      deletedAt: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.sendEmailOtp('test@petcare.vn');

    expect(result.developmentOtpCode).toMatch(/^\d{6}$/);
    expect(mailMock.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('never returns a local OTP preview outside development, even when the flag is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_DEV_OTP_PREVIEW', 'true');
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '1',
      email: 'test@petcare.vn',
      name: 'Test User',
      role: Role.CUSTOMER,
      isActive: true,
      deletedAt: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.sendEmailOtp('test@petcare.vn');

    expect(result).not.toHaveProperty('developmentOtpCode');
    expect(mailMock.sendVerificationCode).toHaveBeenCalledOnce();
  });

  it('should login successfully with valid email OTP', async () => {
    const validExpiry = Date.now() + 600000;
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '1',
      email: 'test@petcare.vn',
      name: 'Test User',
      role: Role.CUSTOMER,
      isActive: true,
      deletedAt: null,
      emailVerifyToken: `123456:${validExpiry}`,
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.loginWithEmailOtp('test@petcare.vn', '123456');
    expect(result.user.email).toBe('test@petcare.vn');
    expect(result.tokens).toBeDefined();
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it('should throw BadRequestException if OTP is wrong or expired', async () => {
    const validExpiry = Date.now() + 600000;
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '1',
      email: 'test@petcare.vn',
      role: Role.CUSTOMER,
      isActive: true,
      deletedAt: null,
      emailVerifyToken: `123456:${validExpiry}`,
    });

    await expect(
      service.loginWithEmailOtp('test@petcare.vn', '999999'),
    ).rejects.toThrow();
  });

  it('should logout and clear refresh token', async () => {
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await service.logout('1');
    expect(result.message).toContain('thành công');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { refreshToken: null },
    });
  });
});
