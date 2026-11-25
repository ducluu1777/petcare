import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/auth.decorator.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { GoogleOAuthDto } from './dto/google-oauth.dto.js';
import { SendEmailOtpDto, EmailOtpLoginDto } from './dto/email-otp.dto.js';
import { AdminPasswordLoginDto } from './dto/admin-password-login.dto.js';
import { AdminLoginThrottleGuard } from './guards/admin-login-throttle.guard.js';

@ApiTags('Auth (Xác thực & Tài khoản)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập Google OAuth',
    description: 'Nhận Google ID Token từ Frontend và tự động tạo mới hoặc liên kết tài khoản hệ thống.',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập Google thành công.' })
  async googleLogin(@Body() dto: GoogleOAuthDto) {
    return this.authService.googleLogin(dto);
  }

  @Public()
  @Post('email-otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi mã OTP đăng nhập qua Email',
    description: 'Tạo mã OTP 6 chữ số gửi tới email để đăng nhập.',
  })
  @ApiResponse({ status: 200, description: 'Gửi mã OTP thành công.' })
  async sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.authService.sendEmailOtp(dto.email);
  }

  @Public()
  @Post('email-otp/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập bằng Email + mã OTP',
    description: 'Xác minh mã OTP gửi qua email và nhận cặp Access/Refresh Token.',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công.' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác hoặc đã hết hạn.' })
  async loginWithEmailOtp(@Body() dto: EmailOtpLoginDto) {
    return this.authService.loginWithEmailOtp(dto.email, dto.code);
  }

  @Public()
  @Post('admin/password/login')
  @UseGuards(AdminLoginThrottleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập Admin/Staff bằng mật khẩu',
    description: 'Chỉ tài khoản Admin hoặc Staff đã được cấp mật khẩu mới đăng nhập được.',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công.' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng.' })
  async loginWithAdminPassword(@Body() dto: AdminPasswordLoginDto) {
    return this.authService.loginWithAdminPassword(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới Access Token',
    description: 'Sử dụng Refresh Token còn hiệu lực để cấp phát Access Token mới.',
  })
  @ApiResponse({ status: 200, description: 'Cấp token mới thành công.' })
  @ApiResponse({ status: 403, description: 'Refresh token không hợp lệ hoặc đã bị thu hồi.' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Thu hồi Refresh Token hiện tại của người dùng trong cơ sở dữ liệu.',
  })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công.' })
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }
}
