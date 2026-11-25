import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PaymentModule } from '../payment/payment.module.js';
import { DeliveryAreasController } from './delivery-areas.controller.js';
import { DeliveryAreasService } from './delivery-areas.service.js';
import { SepayWebhookController } from './sepay-webhook.controller.js';
import { SepayWebhookReviewController } from './sepay-webhook-review.controller.js';
import { SepayWebhookService } from './sepay-webhook.service.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

@Module({
  imports: [PaymentModule, TransactionsModule],
  controllers: [OrdersController, DeliveryAreasController, SepayWebhookController, SepayWebhookReviewController],
  providers: [OrdersService, DeliveryAreasService, SepayWebhookService],
  exports: [OrdersService],
})
export class OrdersModule {}
