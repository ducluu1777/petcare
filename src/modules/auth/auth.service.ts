import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuthProvider, Role, User } from '@prisma/client';
import bcrypt from 'bcrypt';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { GoogleOAuthDto } from './dto/google-oauth.dto.js';
import { MailService } from '../../common/mail/mail.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mail: MailService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private sanitizeUser(user: User) {
    const { refreshToken: _r, ...safeUser } = user;
    return safeUser;
  }

  private async generateTokens(
    userId: string,
    email: string | null | undefined,
    role: Role,
  ) {
    const payload = { sub: userId, email: email ?? undefined, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'super-secret-petcare-jwt-token-key-2026',
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
          '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super-secret-petcare-refresh-token-key-2026',
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
          '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  // ─── Core Auth ────────────────────────────────────────────────────────────

  async googleLogin(dto: GoogleOAuthDto) {
    // 1. Kiểm tra tài khoản OAuth đã tồn tại chưa
    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: OAuthProvider.GOOGLE,
          providerAccountId: dto.providerAccountId,
        },
      },
      include: { user: true },
    });

    let user: User;

    if (oauthAccount) {
      user = oauthAccount.user;
      if (user.role === Role.ADMIN || user.role === Role.STAFF) {
        throw new UnauthorizedException('Tài khoản nội bộ chỉ đăng nhập qua trang quản trị.');
      }
    } else {
      // 2. Kiểm tra xem email đã tồn tại trong hệ thống chưa
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (existingUser) {
        if (existingUser.isActive === false || existingUser.deletedAt) {
          throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc bị xóa. Vui lòng liên hệ quản trị viên.');
        }
        if (existingUser.role === Role.ADMIN || existingUser.role === Role.STAFF) {
          throw new UnauthorizedException('Tài khoản nội bộ chỉ đăng nhập qua trang quản trị.');
        }
        user = existingUser;
        // Liên kết tài khoản OAuth với User hiện tại
        await this.prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider: OAuthProvider.GOOGLE,
            providerAccountId: dto.providerAccountId,
          },
        });
      } else {
        // Tạo tài khoản mới — Google đã verify email, đặt isEmailVerified = true luôn
        user = await this.prisma.user.create({
          data: {
            email: dto.email.toLowerCase(),
            name: dto.name,
            avatarUrl: dto.avatarUrl,
            role: Role.CUSTOMER,
            isEmailVerified: true,
            oauthAccounts: {
              create: {
                provider: OAuthProvider.GOOGLE,
                providerAccountId: dto.providerAccountId,
              },
            },
          },
        });
      }

      // Nếu user đăng ký email trước rồi mới link Google → mark verified luôn
      if (!user.isEmailVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true, emailVerifyToken: null },
        });
      }
    }

    if (user.isActive === false || user.deletedAt) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc bị xóa. Vui lòng liên hệ quản trị viên.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    let payload: { sub: string; email: string; role: Role };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super-secret-petcare-refresh-token-key-2026',
      });
    } catch {
      throw new ForbiddenException('Phiên đăng nhập đã hết hạn hoặc token không hợp lệ.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken || user.isActive === false || user.deletedAt) {
      throw new ForbiddenException('Truy cập bị từ chối hoặc tài khoản đã bị khóa/xóa.');
    }

    const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new ForbiddenException('Refresh Token đã bị thu hồi hoặc không chính xác.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Đăng xuất thành công.' };
  }

  // ─── Đăng nhập bằng Email + OTP ──────────────────────────────────────────

  async sendEmailOtp(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

    if (user && (user.isActive === false || user.deletedAt)) {
      throw new ForbiddenException('Tài khoản này đã bị khóa hoặc bị xóa. Vui lòng liên hệ quản trị viên.');
    }
    if (user && user.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Tài khoản nội bộ vui lòng đăng nhập tại trang quản trị.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    const otpToken = `${otpCode}:${expiry}`;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: Role.CUSTOMER,
          isEmailVerified: true,
          emailVerifyToken: otpToken,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifyToken: otpToken },
      });
    }

    const isDevOtpPreviewEnabled =
      process.env.NODE_ENV === 'development' &&
      this.configService.get<string>('AUTH_DEV_OTP_PREVIEW') === 'true';

    if (!isDevOtpPreviewEnabled) {
      await this.mail.sendVerificationCode(cleanEmail, otpCode, user.name);
    }

    return {
      message: isDevOtpPreviewEnabled
        ? 'Mã xác thực đã sẵn sàng trong môi trường phát triển.'
        : `Đã gửi mã xác thực tới email ${cleanEmail}. Vui lòng kiểm tra hộp thư.`,
      email: cleanEmail,
      ...(isDevOtpPreviewEnabled ? { developmentOtpCode: otpCode } : {}),
    };
  }

  async loginWithEmailOtp(email: string, otp: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user || !user.emailVerifyToken) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc chưa được yêu cầu.');
    }

    if (user.role !== Role.CUSTOMER) {
      throw new UnauthorizedException('Email hoặc mã xác thực không đúng.');
    }

    if (user.isActive === false || user.deletedAt) {
      throw new ForbiddenException('Tài khoản đã bị khóa hoặc bị xóa. Vui lòng liên hệ quản trị viên.');
    }

    const [storedOtp, expiryStr] = user.emailVerifyToken.split(':');
    if (storedOtp !== otp.trim() || Date.now() > Number(expiryStr)) {
      throw new BadRequestException('Mã xác thực không chính xác hoặc đã hết hạn.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: null, isEmailVerified: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async loginWithAdminPassword(email: string, password: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    const invalidCredentials = () => new UnauthorizedException('Email hoặc mật khẩu không đúng.');

    if (
      !user ||
      (user.role !== Role.ADMIN && user.role !== Role.STAFF) ||
      user.isActive === false ||
      user.deletedAt ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw invalidCredentials();
    }

    const credential = await this.prisma.adminCredential.findUnique({
      where: { userId: user.id },
    });

    if (!credential || !(await bcrypt.compare(password, credential.passwordHash))) {
      throw invalidCredentials();
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }
}
