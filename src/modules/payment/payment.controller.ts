import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service.js';
import { Public } from '../../common/decorators/auth.decorator.js';

@ApiTags('Payment (Thanh toán & Tích điểm)')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Get('qr-config')
  @ApiOperation({ summary: 'Thông tin tài khoản nhận VietQR theo kênh' })
  @ApiQuery({ name: 'channel', enum: ['BOOKING', 'ORDER'] })
  @ApiResponse({ status: 200, description: 'Trả thông tin nhận tiền công khai hoặc trạng thái chưa cấu hình.' })
  async getSepayAccountConfig(@Query('channel') channel: string) {
    if (!channel) throw new BadRequestException('Thiếu kênh thanh toán.');
    return this.paymentService.getSepayAccountConfig(channel.toUpperCase());
  }

}
