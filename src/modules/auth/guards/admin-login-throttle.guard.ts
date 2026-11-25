import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

@Injectable()
export class AdminLoginThrottleGuard implements CanActivate {
  private readonly attemptsByAddress = new Map<string, number[]>();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ ip?: string }>();
    const address = request.ip || 'unknown';
    const now = Date.now();
    const recentAttempts = (this.attemptsByAddress.get(address) ?? [])
      .filter((attemptAt) => now - attemptAt < WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recentAttempts.push(now);
    this.attemptsByAddress.set(address, recentAttempts);

    if (this.attemptsByAddress.size > 2000) {
      for (const [key, timestamps] of this.attemptsByAddress) {
        if (!timestamps.some((attemptAt) => now - attemptAt < WINDOW_MS)) {
          this.attemptsByAddress.delete(key);
        }
      }
    }

    return true;
  }
}
