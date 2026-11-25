import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './common/prisma/prisma.module.js';
import { MailModule } from './common/mail/mail.module.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

// Modules
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PetsModule } from './modules/pets/pets.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { TimeSlotsModule } from './modules/time-slots/time-slots.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { VouchersModule } from './modules/vouchers/vouchers.module.js';
import { LoyaltyModule } from './modules/loyalty/loyalty.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { ContactRequestsModule } from './modules/contact-requests/contact-requests.module.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    // Auth & Users
    AuthModule,
    UsersModule,
    // Stage 1: Foundation
    PetsModule,
    // Stage 2: Core Business
    ServicesModule,
    TimeSlotsModule,
    BookingsModule,
    TransactionsModule,
    // Stage 3: Commerce
    ProductsModule,
    OrdersModule,
    VouchersModule,
    LoyaltyModule,
    // Stage 4: Engagement
    ReviewsModule,
    ContactRequestsModule,
    NotificationsModule,
    SchedulerModule,
    UploadModule,
    AiAssistantModule,
    // Legacy
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
