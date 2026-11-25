import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { LoyaltyService } from './loyalty.service.js';

@ApiTags('Loyalty (Tích điểm thành viên)')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('history')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Lịch sử tích/tiêu điểm của tôi' })
  async getHistory(@CurrentUser() user: User) {
    return this.loyaltyService.getHistory(user.id);
  }

  @Get('history/:userId')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Lịch sử cộng/trừ điểm của khách hàng (Admin & Staff)' })
  async getUserHistory(@Param('userId') userId: string) {
    return this.loyaltyService.getHistory(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Tổng điểm tích lũy hiện có' })
  async getSummary(@CurrentUser() user: User) {
    return this.loyaltyService.getSummary(user.id);
  }

  @Get('lookup')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Tra cứu khách tại quầy thu ngân bằng SĐT (Staff & Admin)' })
  async lookup(@Query('phone') phone: string) {
    return this.loyaltyService.lookup(phone);
  }
}
