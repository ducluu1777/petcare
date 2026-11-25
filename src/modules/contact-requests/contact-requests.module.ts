import { Module } from '@nestjs/common';
import { ContactRequestsController } from './contact-requests.controller.js';
import { ContactRequestsService } from './contact-requests.service.js';

@Module({
  controllers: [ContactRequestsController],
  providers: [ContactRequestsService],
})
export class ContactRequestsModule {}
