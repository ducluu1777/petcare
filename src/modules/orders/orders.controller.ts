import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateInStoreSaleDto } from './dto/create-in-store-sale.dto.js';
import { ConfirmBankTransferDto } from '../payment/dto/confirm-bank-transfer.dto.js';
import { CancelOnlineOrderDto } from './dto/cancel-online-order.dto.js';
import { requireIdempotencyKey } from '../../common/idempotency.js';

@ApiTags('Orders (Đơn hàng sản phẩm)')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Tạo đơn mua hàng', description: 'Validate stock, snapshot giá, áp voucher.' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(user.id, dto, requireIdempotencyKey(idempotencyKey));
  }

  @Get('me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Lịch sử mua hàng của tôi' })
  async findMine(@CurrentUser() user: User) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Get('admin/summary')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tổng quan đơn hàng cho nhân viên vận hành và Admin' })
  async getAdminSummary() {
    return this.ordersService.getAdminSummary();
  }

  @Get('admin/dashboard-queue')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Đơn cần xử lý và đơn quá hạn cho Dashboard' })
  async getDashboardQueue(@Query('page') page?: string) {
    return this.ordersService.getDashboardQueue(page ? Number(page) : 1);
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tất cả đơn hàng (Staff & Admin)' })
  async findAll(
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('overdueOnly') overdueOnly?: string,
  ) {
    return this.ordersService.findAll({ status, search, page: page ? +page : undefined, limit: limit ? +limit : undefined, overdueOnly: overdueOnly === 'true' });
  }

  @Post('admin/:id/confirm-transfer')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Xác nhận chuyển khoản đơn online sau khi kiểm tra giao dịch trên SePay' })
  async confirmOnlineOrderTransfer(
    @Param('id') id: string,
    @Body() dto: ConfirmBankTransferDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.confirmOnlineOrderTransfer(id, dto, user.id);
  }

  @Post('in-store')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Ghi nhận bán sản phẩm tại quầy', description: 'Hỗ trợ khách lẻ hoặc khách có tài khoản, tiền mặt hoặc QR.' })
  async createInStoreSale(
    @Body() dto: CreateInStoreSaleDto,
    @CurrentUser() user: User,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createInStoreSale(dto, requireIdempotencyKey(idempotencyKey), user.id);
  }

  @Get('admin/in-store/payment-intents/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy trạng thái QR bán tại quầy' })
  async findCounterSalePaymentIntent(@Param('id') id: string) {
    return this.ordersService.findCounterSalePaymentIntent(id);
  }

  @Post('admin/in-store/payment-intents/:id/confirm')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Xác nhận chuyển khoản bán tại quầy sau khi kiểm tra giao dịch trên SePay' })
  async confirmCounterSaleTransfer(
    @Param('id') id: string,
    @Body() dto: ConfirmBankTransferDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.confirmCounterSaleTransfer(id, dto, user.id);
  }

  @Post('admin/in-store/payment-intents/:id/cancel')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Hủy QR chưa thanh toán và giải phóng tồn đang giữ' })
  async cancelCounterSalePaymentIntent(@Param('id') id: string) {
    return this.ordersService.cancelCounterSalePaymentIntent(id);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Tra cứu đơn hàng theo mã' })
  async findByCode(@Param('code') code: string, @CurrentUser() user: User) {
    return this.ordersService.findByCode(code, user);
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Staff & Admin)', description: 'COMPLETED → cộng điểm Loyalty.' })
  async updateStatus(@Param('id') id: string, @Query('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status);
  }

  @Post(':id/cancel')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Hủy đơn online trước khi khách nhận; cần lý do và trả tồn/voucher' })
  async cancelOnlineOrder(@Param('id') id: string, @Body() dto: CancelOnlineOrderDto) {
    return this.ordersService.cancelOnlineOrder(id, dto.reason, dto.goodsReturned);
  }

  @Post(':id/refund')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Ghi nhận đã hoàn toàn bộ tiền đơn online sau khi chuyển tiền cho khách' })
  async recordOnlineOrderRefund(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.recordOnlineOrderRefund(id, user.id);
  }
}
