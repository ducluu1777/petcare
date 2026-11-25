import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactRequestStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateContactRequestDto } from './dto/create-contact-request.dto.js';

@Injectable()
export class ContactRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactRequestDto) {
    return this.prisma.contactRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim() || null,
        topic: dto.topic,
        petInfo: dto.petInfo?.trim() || null,
        message: dto.message.trim(),
      },
    });
  }

  async findAdmin(query: { status?: ContactRequestStatus; page: number; pageSize: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contactRequest.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getDashboardQueue() {
    const where = { status: { not: ContactRequestStatus.RESOLVED } };
    const [openCount, items] = await Promise.all([
      this.prisma.contactRequest.count({ where }),
      this.prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    return { openCount, items };
  }

  async updateStatus(id: string, status: ContactRequestStatus) {
    const existing = await this.prisma.contactRequest.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Không tìm thấy yêu cầu liên hệ.');
    return this.prisma.contactRequest.update({ where: { id }, data: { status } });
  }
}
