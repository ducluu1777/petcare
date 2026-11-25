import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/auth.decorator.js';
import { SepayWebhookService } from './sepay-webhook.service.js';

@ApiTags('SePay webhook')
@Controller('payment/sepay')
export class SepayWebhookController {
  constructor(private readonly webhook: SepayWebhookService) {}

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Nhận giao dịch tiền vào SePay cho đơn online' })
  receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-sepay-timestamp') timestamp?: string,
    @Headers('x-sepay-signature') signature?: string,
  ) {
    return this.webhook.receive(request.rawBody, timestamp, signature);
  }
}
