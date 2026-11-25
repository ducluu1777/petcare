import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { CreateBookingQrIntentDto } from './dto/create-booking-qr-intent.dto.js';
import { ConfirmBankTransferDto } from '../payment/dto/confirm-bank-transfer.dto.js';

@ApiTags('Transactions (Giao dịch thanh toán)')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('qr-intent')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Tạo hoặc lấy lại mã QR chờ thanh toán cho lịch hẹn',
    description: 'Tạo khoản chờ có số tiền và mã voucher cố định để khách chuyển vào tài khoản nhận chung.',
  })
  async createQrIntent(@Body() dto: CreateBookingQrIntentDto) {
    return this.transactionsService.createQrPaymentIntent(dto);
  }

  @Post('qr-intent/:intentId/confirm')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Xác nhận chuyển khoản booking sau khi kiểm tra giao dịch trên SePay' })
  async confirmQrPayment(
    @Param('intentId') intentId: string,
    @Body() dto: ConfirmBankTransferDto,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.confirmBookingQrPayment(intentId, dto, user.id);
  }

  @Get('qr-intent/:bookingId')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy trạng thái mã QR chờ thanh toán của lịch hẹn' })
  async findQrIntent(@Param('bookingId') bookingId: string) {
    return this.transactionsService.findQrPaymentIntent(bookingId);
  }

  @Post('qr-intent/:intentId/cancel')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Hủy mã QR chưa được thanh toán' })
  async cancelQrIntent(@Param('intentId') intentId: string) {
    return this.transactionsService.cancelQrPaymentIntent(intentId);
  }

  @Post()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Ghi nhận giao dịch thanh toán (Staff & Admin)',
    description: 'Tất toán tại quầy (FINAL_PAYMENT): áp dụng voucher (nếu có), đánh dấu đã thanh toán và cộng điểm tích lũy.',
  })
  async create(@Body() dto: CreateTransactionDto, @CurrentUser() user: User) {
    return this.transactionsService.create(dto, user.id);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Lịch sử giao dịch theo lịch hẹn' })
  async findByBooking(@Param('bookingId') bookingId: string) {
    return this.transactionsService.findByBooking(bookingId);
  }

  @Get('summary')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Doanh thu theo ngày N ngày gần nhất (Staff & Admin)', description: 'Dùng cho biểu đồ doanh thu tuần.' })
  async getSummary(@Query('days') days?: string) {
    return this.transactionsService.getDailySummary(days ? Number(days) : 7);
  }

  @Get('admin/today-summary')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tổng hợp giao dịch hôm nay theo múi giờ Việt Nam' })
  async getTodayAdminSummary() {
    return this.transactionsService.getTodayAdminSummary();
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tất cả giao dịch thanh toán (Staff & Admin)', description: 'Sổ quỹ thu ngân, đối soát VietQR và tiền mặt.' })
  async findAll() {
    return this.transactionsService.findAll();
  }
}
