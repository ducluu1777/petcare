import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'PetCare API is running!';
  }

  async getHealth() {
    const dbCheck = await this.prisma.$queryRaw<{ connected: number }[]>`SELECT 1 as connected`;
    const userCount = await this.prisma.user.count();

    return {
      status: 'ok',
      service: 'petcare-be',
      timestamp: new Date().toISOString(),
      database: {
        connected: Boolean(dbCheck && dbCheck.length > 0),
        userCount,
      },
    };
  }
}
