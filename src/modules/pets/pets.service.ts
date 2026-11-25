import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BehavioralFlag, BookingStatus, BookingStatusV2, Role, Species } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';

/**
 * Tính ngày đi spa tiếp theo dựa trên giống (breed).
 * Giống cần cắt tỉa thường xuyên: 4 tuần (28 ngày)
 * Giống lông ngắn/trung: 6 tuần (42 ngày)
 * Giống lông dài/ít cần cắt: 8 tuần (56 ngày)
 */
function calcNextSpaDate(breed: string): Date {
  const shortCycleBreeds = ['poodle', 'yorkshire', 'bichon', 'maltese', 'shih tzu', 'persian'];
  const longCycleBreeds = ['golden', 'husky', 'samoyed', 'alaska', 'bernese', 'labrador'];

  const b = breed.toLowerCase();
  let daysUntilNext = 42; // default 6 tuần

  if (shortCycleBreeds.some((s) => b.includes(s))) {
    daysUntilNext = 28;
  } else if (longCycleBreeds.some((s) => b.includes(s))) {
    daysUntilNext = 56;
  }

  const date = new Date();
  date.setDate(date.getDate() + daysUntilNext);
  return date;
}

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePetDto) {
    const nextSpaDate = calcNextSpaDate(dto.breed);
    const fallbackName = dto.species === Species.DOG ? 'Bé Cún' : 'Bé Mèo';
    const petName = dto.name?.trim() ? dto.name.trim() : fallbackName;

    return this.prisma.petProfile.create({
      data: {
        userId,
        name: petName,
        species: dto.species,
        breed: dto.breed,
        weightKg: dto.weightKg,
        ageMonths: dto.ageMonths,
        avatarUrl: dto.avatarUrl,
        notes: dto.notes,
        hasVaccine: dto.hasVaccine ?? false,
        behavioralFlag: dto.behavioralFlag ?? BehavioralFlag.NORMAL,
        nextSpaDate,
      },
    });
  }

  async createForCustomer(userId: string, dto: CreatePetDto) {
    const customer = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: Role.CUSTOMER,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException('Tài khoản khách hàng không tồn tại hoặc đang bị khóa.');
    }
    return this.create(customer.id, dto);
  }

  async findAllByUser(userId: string) {
    return this.prisma.petProfile.findMany({
      where: { userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.petProfile.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        _count: { select: { bookings: true } },
        bookings: {
          select: {
            id: true,
            code: true,
            createdAt: true,
            startAt: true,
            status: true,
            statusV2: true,
            timeSlot: { select: { slotDate: true, slotTime: true } },
            services: { include: { service: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, requesterId: string, requesterRole: Role) {
    const pet = await this.prisma.petProfile.findUnique({ where: { id } });

    if (!pet) {
      throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
    }

    // Customer chỉ xem được pet của mình
    if (requesterRole === Role.CUSTOMER && pet.userId !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền xem hồ sơ này.');
    }

    return pet;
  }

  async update(id: string, userId: string, role: Role = Role.CUSTOMER, dto: UpdatePetDto) {
    const pet = await this.prisma.petProfile.findUnique({ where: { id } });

    if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
    if (role === Role.CUSTOMER && pet.userId !== userId) {
      throw new ForbiddenException('Bạn không sở hữu thú cưng này.');
    }

    const nextSpaDate = dto.breed ? calcNextSpaDate(dto.breed) : undefined;

    return this.prisma.petProfile.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.species !== undefined && { species: dto.species }),
        ...(dto.breed !== undefined && { breed: dto.breed, nextSpaDate }),
        ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
        ...(dto.ageMonths !== undefined && { ageMonths: dto.ageMonths }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.hasVaccine !== undefined && { hasVaccine: dto.hasVaccine }),
        ...(dto.behavioralFlag !== undefined && { behavioralFlag: dto.behavioralFlag }),
      },
    });
  }

  async remove(id: string, userId: string, role: Role = Role.CUSTOMER) {
    const pet = await this.prisma.petProfile.findUnique({ where: { id } });

    if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
    if (role === Role.CUSTOMER && pet.userId !== userId) {
      throw new ForbiddenException('Bạn không sở hữu thú cưng này.');
    }

    const bookingHistory = await this.prisma.booking.findFirst({
      where: { petId: id },
      select: { id: true },
    });

    if (bookingHistory) {
      throw new BadRequestException(
        'Hồ sơ đã có lịch sử đặt hẹn nên không thể xóa vĩnh viễn. Hãy lưu trữ hồ sơ để giữ lại lịch sử.',
      );
    }

    await this.prisma.petProfile.delete({ where: { id } });
    return { message: 'Đã xóa vĩnh viễn hồ sơ thú cưng.' };
  }

  async archive(id: string) {
    const pet = await this.prisma.petProfile.findUnique({ where: { id } });
    if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
    if (pet.archivedAt) return pet;

    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        petId: id,
        OR: [
          {
            statusV2: null,
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.IN_PROGRESS,
                BookingStatus.READY_FOR_PICKUP,
              ],
            },
          },
          {
            statusV2: {
              in: [
                BookingStatusV2.BOOKED,
                BookingStatusV2.ARRIVED,
                BookingStatusV2.IN_SERVICE,
                BookingStatusV2.READY_FOR_PICKUP,
              ],
            },
          },
        ],
      },
      select: { id: true },
    });

    if (activeBooking) {
      throw new BadRequestException(
        'Không thể lưu trữ hồ sơ khi thú cưng còn lịch chưa hoàn tất hoặc chưa bàn giao.',
      );
    }

    return this.prisma.petProfile.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string) {
    const pet = await this.prisma.petProfile.findUnique({ where: { id } });
    if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
    if (!pet.archivedAt) return pet;

    return this.prisma.petProfile.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async setBehavioralFlag(id: string, behavioralFlag: BehavioralFlag) {
    const pet = await this.prisma.petProfile.findUnique({ where: { id } });
    if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');

    return this.prisma.petProfile.update({
      where: { id },
      data: { behavioralFlag },
    });
  }
}
