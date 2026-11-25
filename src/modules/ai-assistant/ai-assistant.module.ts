import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller.js';
import { AiAssistantService } from './ai-assistant.service.js';
import { AiKnowledgeService } from './ai-knowledge.service.js';
import { AiBookingService } from './ai-booking.service.js';
import { AiWorkflowController } from './ai-workflow.controller.js';
import { AiWorkflowService } from './ai-workflow.service.js';
import { AiAdminController } from './ai-admin.controller.js';
import { AiAdminService } from './ai-admin.service.js';
import { ServicesModule } from '../services/services.module.js';
import { ProductsModule } from '../products/products.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { PetsModule } from '../pets/pets.module.js';

@Module({
  imports: [
    ServicesModule,
    ProductsModule,
    BookingsModule,
    PetsModule
  ],
  controllers: [AiAssistantController, AiWorkflowController, AiAdminController],
  providers: [AiAssistantService, AiKnowledgeService, AiBookingService, AiWorkflowService, AiAdminService],
})
export class AiAssistantModule {}
