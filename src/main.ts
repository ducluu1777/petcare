import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createValidationException } from './common/validation-exception.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });

  // Versioned prefix: /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Auto-validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // Auto-transform types (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: createValidationException,
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('PetCare Vietnam API')
    .setDescription('Tài liệu API cho hệ thống PetCare Backend')
    .setVersion('1.0')
    .addBearerAuth() // Cho phép nhập JWT Token trên UI Swagger
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Lưu lại token sau khi refresh trang
    },
  });

  const port = process.env.PORT || 3001;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  logger.log(`PetCare Backend is running on: http://${displayHost}:${port}/api/v1`);
  logger.log(`Swagger Documentation is available at: http://${displayHost}:${port}/api/docs`);
}
await bootstrap();

