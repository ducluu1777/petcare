import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs unexpected server errors but keeps the response generic', () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const request = { method: 'PATCH', originalUrl: '/api/v1/bookings/bk-1/status-v2' };
    const host = {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
    } as unknown as ArgumentsHost;

    new GlobalExceptionFilter().catch(new Error('database constraint failed'), host);

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('PATCH /api/v1/bookings/bk-1/status-v2'),
      expect.any(String),
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' },
    });
  });

  it('does not log expected client errors as server failures', () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ method: 'PATCH', originalUrl: '/api/v1/bookings/bk-1/status-v2' }) }),
    } as unknown as ArgumentsHost;

    new GlobalExceptionFilter().catch(new HttpException('Invalid transition', HttpStatus.BAD_REQUEST), host);

    expect(logError).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });
});
