import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SlotPeriod } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  BulkCreateTimeSlotsDto,
  UpdateTimeSlotDto,
} from './dto/time-slot.dto.js';

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  private parseDateOnly(date: string): Date {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD.');
    }
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('Ngày không hợp lệ.');
    }
    return parsed;
  }

  /** Read-only availability lookup for assistants and other non-booking callers. */
  async findExistingAvailableByDate(date: string) {
    const slotDate = this.parseDateOnly(date);
    const slots = await this.prisma.timeSlot.findMany({
      where: { slotDate },
      orderBy: { slotTime: 'asc' },
    });
    return {
      configured: slots.length > 0,
      slots: slots.filter((slot) => slot.booked < slot.capacity),
    };
  }

  /** Admin view includes full slots; the public availability endpoint intentionally does not. */
  async findAdminRange(from: string, to: string) {
    const fromDate = this.parseDateOnly(from);
    const toDate = this.parseDateOnly(to);
    if (fromDate > toDate) throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    return this.prisma.timeSlot.findMany({
      where: { slotDate: { gte: fromDate, lte: toDate } },
      orderBy: [{ slotDate: 'asc' }, { slotTime: 'asc' }],
    });
  }

  async findAvailable(date: string) {
    return this.findAvailableByDate(date);
  }

  /**
   * Lấy slot khả dụng theo ngày. Nếu ngày đó chưa được khởi tạo, tự động tạo lịch tiêu chuẩn.
   */
  async findAvailableByDate(date: string) {
    const slotDate = new Date(date);

    let slots = await this.prisma.timeSlot.findMany({
      where: { slotDate },
      orderBy: { slotTime: 'asc' },
    });

    if (slots.length === 0) {
      const slotTimes = ['08:30', '10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];
      const defaultSlots = slotTimes.map((time) => {
        const isMorning = parseInt(time.split(':')[0]) < 12;
        return {
          slotDate,
          slotTime: time,
          period: isMorning ? SlotPeriod.MORNING : SlotPeriod.AFTERNOON,
          capacity: 4,
          booked: 0,
        };
      });

      await this.prisma.timeSlot.createMany({
        data: defaultSlots,
        skipDuplicates: true,
      });

      slots = await this.prisma.timeSlot.findMany({
        where: { slotDate },
        orderBy: { slotTime: 'asc' },
      });
    }

    return slots.filter((s) => s.booked < s.capacity);
  }

  async bulkCreate(dto: BulkCreateTimeSlotsDto) {
    const results = [];

    for (const slot of dto.slots) {
      const existing = await this.prisma.timeSlot.findUnique({
        where: {
          slotDate_slotTime: {
            slotDate: new Date(slot.slotDate),
            slotTime: slot.slotTime,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Slot ${slot.slotDate} ${slot.slotTime} đã tồn tại.`,
        );
      }

      const created = await this.prisma.timeSlot.create({
        data: {
          slotDate: new Date(slot.slotDate),
          slotTime: slot.slotTime,
          period: slot.period,
          capacity: slot.capacity ?? 5,
        },
      });
      results.push(created);
    }

    return results;
  }

  async update(id: string, dto: UpdateTimeSlotDto) {
    const slot = await this.prisma.timeSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Không tìm thấy khung giờ.');
    if (dto.capacity !== undefined && dto.capacity < slot.booked) {
      throw new ConflictException('Sức chứa không thể thấp hơn số lịch hẹn đã đặt.');
    }

    return this.prisma.timeSlot.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const slot = await this.prisma.timeSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Không tìm thấy khung giờ.');
    const bookingCount = await this.prisma.booking.count({ where: { timeSlotId: id } });
    if (bookingCount > 0) {
      throw new ConflictException('Không thể xóa khung giờ đã có lịch hẹn. Hãy xử lý các lịch hẹn trước.');
    }
    try {
      await this.prisma.timeSlot.delete({ where: { id } });
    } catch (error: any) {
      // A booking can be created between the count and delete; preserve the FK invariant.
      if (error?.code === 'P2003') {
        throw new ConflictException('Không thể xóa khung giờ đã có lịch hẹn. Hãy xử lý các lịch hẹn trước.');
      }
      throw error;
    }
    return { message: 'Đã xóa khung giờ.' };
  }

  async findById(id: string) {
    const slot = await this.prisma.timeSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Không tìm thấy khung giờ.');
    return slot;
  }
}
