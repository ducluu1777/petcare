import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã xảy ra lỗi. Vui lòng thử lại sau.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) ?? message;
        code = (res.code as string) ?? HttpStatus[status];
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const request = ctx.getRequest<{ method?: string; originalUrl?: string; url?: string }>();
      const route = `${request.method ?? 'UNKNOWN'} ${request.originalUrl ?? request.url ?? 'unknown route'}`;
      const detail = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${route} -> ${status}: ${detail}`, stack);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
    });
  }
}
