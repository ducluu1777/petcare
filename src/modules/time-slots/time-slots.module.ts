import { Module } from '@nestjs/common';
import { TimeSlotsController } from './time-slots.controller.js';
import { TimeSlotsService } from './time-slots.service.js';

@Module({
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService],
  exports: [TimeSlotsService],
})
export class TimeSlotsModule {}
