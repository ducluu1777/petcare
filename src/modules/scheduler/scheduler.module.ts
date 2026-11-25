import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
