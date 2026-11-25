import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ContactRequestsService } from './contact-requests.service.js';

describe('ContactRequestsService', () => {
  let service: ContactRequestsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      contactRequest: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [ContactRequestsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ContactRequestsService);
  });

  it('stores trimmed contact details and normalizes blank optional values', async () => {
    prisma.contactRequest.create.mockResolvedValue({ id: 'request-1' });

    await service.create({
      fullName: '  Minh Anh  ',
      phone: ' 0941 900 966 ',
      email: '  ',
      topic: 'tu-van-spa',
      petInfo: '  ',
      message: ' Bé nhà mình cần tư vấn tắm. ',
    });

    expect(prisma.contactRequest.create).toHaveBeenCalledWith({
      data: {
        fullName: 'Minh Anh',
        phone: '0941 900 966',
        email: null,
        topic: 'tu-van-spa',
        petInfo: null,
        message: 'Bé nhà mình cần tư vấn tắm.',
      },
    });
  });

  it('returns a paged newest-first list with an optional status filter', async () => {
    prisma.contactRequest.findMany.mockResolvedValue([{ id: 'request-2' }]);
    prisma.contactRequest.count.mockResolvedValue(21);

    await expect(service.findAdmin({ status: 'NEW', page: 2, pageSize: 10 })).resolves.toEqual({
      items: [{ id: 'request-2' }],
      total: 21,
      page: 2,
      pageSize: 10,
    });
    expect(prisma.contactRequest.findMany).toHaveBeenCalledWith({
      where: { status: 'NEW' },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
  });

  it('shows unresolved count and the five latest requests on the dashboard', async () => {
    prisma.contactRequest.count.mockResolvedValue(6);
    prisma.contactRequest.findMany.mockResolvedValue([{ id: 'request-3' }]);

    await expect(service.getDashboardQueue()).resolves.toEqual({
      openCount: 6,
      items: [{ id: 'request-3' }],
    });
    expect(prisma.contactRequest.findMany).toHaveBeenCalledWith({
      where: { status: { not: 'RESOLVED' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  });

  it('rejects a status update when the request does not exist', async () => {
    prisma.contactRequest.findUnique.mockResolvedValue(null);

    await expect(service.updateStatus('missing', 'IN_PROGRESS')).rejects.toThrow('Không tìm thấy yêu cầu liên hệ.');
    expect(prisma.contactRequest.update).not.toHaveBeenCalled();
  });
});
