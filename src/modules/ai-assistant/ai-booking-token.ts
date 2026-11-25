import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export interface AiBookingClaims {
  userId: string;
  petId: string;
  serviceIds: string[];
  startAt: string;
  expectedState: string;
  confirmationId: string;
  expiresAt: number;
}

export class AiBookingToken {
  constructor(private readonly secret: string) {
    if (!secret) throw new Error('Cần JWT_SECRET để ký xác nhận booking.');
  }

  issue(input: Omit<AiBookingClaims, 'confirmationId' | 'expiresAt'>) {
    const claims: AiBookingClaims = { ...input, confirmationId: randomUUID(), expiresAt: Date.now() + 10 * 60_000 };
    const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return { token: `${body}.${this.sign(body)}`, expiresAt: claims.expiresAt };
  }

  verify(token: string, userId: string): AiBookingClaims {
    try {
      const [body, signature, extra] = token.split('.');
      if (!body || !signature || extra) throw new Error();
      const actual = Buffer.from(signature, 'base64url');
      const expected = Buffer.from(this.sign(body), 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as AiBookingClaims;
      if (claims.userId !== userId || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= Date.now()
        || !claims.petId || !claims.startAt || !claims.confirmationId || !claims.expectedState
        || !Array.isArray(claims.serviceIds) || !claims.serviceIds.length) throw new Error();
      return claims;
    } catch {
      throw new BadRequestException('Bản xác nhận đã hết hạn hoặc không hợp lệ. Bạn vui lòng xem lại lịch trước khi xác nhận.');
    }
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(`petcare:ai-booking:v1:${body}`).digest('base64url');
  }
}
