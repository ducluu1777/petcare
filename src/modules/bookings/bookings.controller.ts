import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingSource, Role } from '@prisma/client';
import type { User } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public, Roles } from '../../common/decorators/auth.decorator.js';
import { BookingsService } from './bookings.service.js';
import {
  ChangeStatusDto,
  CreateBookingV2Dto,
  QueryAvailableSlotsDto,
  RescheduleBookingDto,
} from './dto/create-booking-v2.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import {
  AssignStaffDto,
  CancelBookingDto,
  CreateBookingReweighQuoteDto,
  DecideBookingReweighDto,
  QueryBookingDto,
  UpdateBookingAddonsDto,
  UpdateBookingStatusDto,
} from './dto/update-booking.dto.js';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto.js';
import { UpdateSpaBookingPromotionDto } from './dto/update-spa-booking-promotion.dto.js';
import { requireIdempotencyKey } from '../../common/idempotency.js';

@ApiTags('Bookings (Đặt lịch Spa)')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('v2')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Đặt lịch V2 (công suất theo khung giờ bắt đầu)', description: 'Server tra giá theo cân nặng từ DB và kiểm tra công suất của khung giờ bắt đầu; thời lượng dịch vụ không giữ chỗ.' })
  async createV2(
    @CurrentUser() user: User,
    @Body() dto: CreateBookingV2Dto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookingsService.bookAppointmentTx(
      { userId: user.id, role: user.role },
      dto,
      undefined,
      undefined,
      requireIdempotencyKey(idempotencyKey),
    );
  }

  @Get('available-slots')
  @Public()
  @ApiOperation({ summary: 'Tra cứu các khung giờ bắt đầu còn trống cho Web' })
  async getAvailableSlots(@Query() query: QueryAvailableSlotsDto) {
    return this.bookingsService.getAvailableSlots(query);
  }

  @Get('available-slots/receptionist')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tra cứu khung giờ còn chỗ cho nhân viên đặt lịch qua điện thoại hoặc tin nhắn' })
  async getReceptionistAvailableSlots(@Query() query: QueryAvailableSlotsDto) {
    return this.bookingsService.getAvailableSlots(query, BookingSource.RECEPTIONIST);
  }

  @Get('settings')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Xem giờ hoạt động, ngày nghỉ và công suất (Staff & Admin)' })
  async getAdminScheduleSettings() {
    return this.bookingsService.getAdminScheduleSettings();
  }

  @Patch('settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật giờ hoạt động, ngày nghỉ và công suất Spa (Admin)' })
  async updateAdminScheduleSettings(@Body() dto: UpdateShopSettingsDto) {
    return this.bookingsService.updateAdminScheduleSettings(dto);
  }

  @Get('settings/spa-booking-promotion')
  @ApiOperation({ summary: 'Xem trạng thái ưu đãi đặt lịch Spa' })
  async getSpaBookingPromotion() {
    return this.bookingsService.getSpaBookingPromotion();
  }

  @Patch('settings/spa-booking-promotion')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bật hoặc tạm ngưng ưu đãi đặt lịch Spa' })
  async updateSpaBookingPromotion(@Body() dto: UpdateSpaBookingPromotionDto) {
    return this.bookingsService.updateSpaBookingPromotion(dto.active);
  }

  @Patch(':id/reschedule')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Đổi giờ lịch hẹn V2 (Khóa 2 ngày chống deadlock)' })
  async reschedule(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.rescheduleAppointmentTx(id, { userId: user.id, role: user.role }, dto);
  }

  @Patch(':id/status-v2')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Chuyển trạng thái lịch hẹn V2 (Conditional update chống bấm đúp)' })
  async updateStatusV2(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.bookingsService.changeStatusV2(id, { userId: user.id, role: user.role }, dto);
  }

  @Post(':id/reweigh/quote')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cân nặng thực tế và tự tính lại giá lịch hẹn' })
  async createReweighQuote(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateBookingReweighQuoteDto,
  ) {
    return this.bookingsService.createReweighQuote(id, { userId: user.id, role: user.role }, dto);
  }

  @Patch(':id/reweigh/decision')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Ghi nhận quyết định báo giá cũ' })
  async decideReweigh(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: DecideBookingReweighDto,
  ) {
    return this.bookingsService.decideReweigh(id, { userId: user.id, role: user.role }, dto);
  }

  @Post()
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tạo đặt lịch Spa', description: 'Tính giá theo bảng tier, kiểm tra khung giờ. Giữ chỗ dịch vụ, thanh toán & ưu đãi áp dụng tại quầy.' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookingsService.create(user.id, user.role, dto, requireIdempotencyKey(idempotencyKey));
  }

  @Get('me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Lịch sử đặt lịch của tôi' })
  async findMine(@CurrentUser() user: User) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Get('today')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Lịch hẹn hôm nay (Dashboard nhân viên)' })
  async findToday() {
    return this.bookingsService.findToday();
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tất cả lịch hẹn (Staff & Admin)', description: 'Filter theo status, ngày. Phân trang.' })
  async findAll(@Query() query: QueryBookingDto) {
    return this.bookingsService.findAll(query);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Tra cứu lịch hẹn theo mã', description: 'Customer chỉ xem được đơn của mình.' })
  async findByCode(@CurrentUser() user: User, @Param('code') code: string) {
    return this.bookingsService.findByCode(code, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Chuyển trạng thái lịch hẹn (Staff & Admin)', description: 'Tuân theo state machine: PENDING→CONFIRMED→IN_PROGRESS→READY_FOR_PICKUP→COMPLETED.' })
  async updateStatus(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.updateStatus(id, dto, { userId: user.id, role: user.role });
  }

  @Patch(':id/services')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Thêm/bỏ Add-on dịch vụ (Staff & Admin)', description: 'Chỉ khi booking đang CONFIRMED hoặc IN_PROGRESS. Tự tính lại tổng tiền.' })
  async updateAddons(@Param('id') id: string, @Body() dto: UpdateBookingAddonsDto) {
    return this.bookingsService.updateAddons(id, dto);
  }

  @Patch(':id/waiver')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Ghi nhận ký Phiếu cam kết (Staff & Admin)' })
  async acceptWaiver(@Param('id') id: string) {
    return this.bookingsService.acceptWaiver(id);
  }

  @Patch(':id/assign-staff')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Phân công nhân viên phụ trách (Staff & Admin)' })
  async assignStaff(@Param('id') id: string, @Body() dto: AssignStaffDto) {
    return this.bookingsService.assignStaff(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy lịch hẹn', description: 'Customer hủy được đơn của mình khi PENDING/CONFIRMED.' })
  async cancel(@CurrentUser() user: User, @Param('id') id: string, @Body() dto?: CancelBookingDto) {
    return this.bookingsService.cancel(id, user.id, user.role, dto?.reason);
  }
}
