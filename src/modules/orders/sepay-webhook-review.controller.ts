import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { IsString, MinLength } from 'class-validator';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SepayWebhookService } from './sepay-webhook.service.js';

class ReviewTransferDto {
  @IsString()
  @MinLength(3)
  note: string;
}

@ApiTags('SePay webhook review')
@Controller('payment/sepay/review')
export class SepayWebhookReviewController {
  constructor(private readonly webhook: SepayWebhookService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Tình trạng cấu hình và các giao dịch SePay cho Dashboard' })
  dashboard(@Query('page') page?: string) {
    return this.webhook.getDashboard(page ? Number(page) : 1);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Giao dịch online SePay cần nhân viên đối chiếu' })
  list(@Query('id') id?: string) {
    return this.webhook.listReview(id?.trim() || undefined);
  }

  @Post(':id/complete')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Ghi cách xử lý và đóng giao dịch cần đối chiếu' })
  complete(@Param('id') id: string, @Body() body: ReviewTransferDto, @CurrentUser() user: User) {
    return this.webhook.markReviewed(id, body.note, user.id);
  }
}
