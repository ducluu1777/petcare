import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ServicesService } from '../services/services.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { bookingQuoteFingerprint } from '../bookings/booking-confirmation.js';
import { formatVnDate, formatVnTime } from '../bookings/bookings-v2.utils.js';
import { AiBookingToken } from './ai-booking-token.js';

@Injectable()
export class AiBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesService,
    private readonly bookings: BookingsService,
    private readonly config: ConfigService,
  ) {}

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.user.findFirst({ where: { id: userId, role: Role.CUSTOMER, isActive: true, deletedAt: null }, select: { id: true } });
    if (!customer) throw new ForbiddenException('Tài khoản khách hàng không hoạt động. Vui lòng đăng nhập lại.');
  }

  private codec() { return new AiBookingToken(this.config.get<string>('JWT_SECRET') || 'super-secret-petcare-jwt-token-key-2026'); }

  async options(userId: string) {
    await this.requireCustomer(userId);
    const [pets, services] = await Promise.all([
      this.prisma.petProfile.findMany({ where: { userId, archivedAt: null }, select: { id: true, name: true, species: true, weightKg: true } }),
      this.services.findAll(),
    ]);
    return { pets, services: services.map(service => ({ id: service.id, name: service.name, category: service.category, isAddon: service.isAddon, priceTiers: service.priceTiers })) };
  }

  async slots(userId: string, input: { date: string; serviceIds: string[] }) {
    await this.requireCustomer(userId);
    return this.bookings.getAvailableSlots(input);
  }

  async prepare(userId: string, input: { petId: string; serviceIds: string[]; startAt: string }) {
    await this.requireCustomer(userId);
    const pet = await this.prisma.petProfile.findFirst({ where: { id: input.petId, userId, archivedAt: null }, select: { id: true, name: true, species: true, weightKg: true } });
    if (!pet) throw new BadRequestException('Không tìm thấy hồ sơ thú cưng đang hoạt động của bạn.');
    const activeServices = await this.services.findAll();
    const ids = [...new Set(input.serviceIds)];
    const services = activeServices.filter(service => ids.includes(service.id));
    if (!ids.length || services.length !== ids.length || services.filter(service => !service.isAddon).length !== 1) {
      throw new BadRequestException('Vui lòng chọn đúng một dịch vụ chính đang hoạt động cùng các tiện ích phù hợp.');
    }
    const startAt = new Date(input.startAt);
    if (!Number.isFinite(startAt.getTime())) throw new BadRequestException('Giờ hẹn không hợp lệ.');
    const availability = await this.bookings.getAvailableSlots({ date: formatVnDate(startAt), serviceIds: ids });
    if (!availability.slots.some(slot => slot.time === formatVnTime(startAt) && slot.available && slot.remaining > 0)) {
      throw new ConflictException('Khung giờ đã hết chỗ hoặc không còn nhận lịch. Bạn vui lòng chọn lại.');
    }
    const lines = await Promise.all(services.map(async service => ({ id: service.id, name: service.name, price: (await this.services.calculatePrice(service.id, undefined, pet.weightKg, pet.species)).priceApplied })));
    const expectedState = bookingQuoteFingerprint(pet, services, new Map(lines.map(line => [line.id, line.price])));
    const signed = this.codec().issue({ userId, petId: pet.id, serviceIds: ids, startAt: input.startAt, expectedState });
    return { ...signed, pet, services: lines, startAt: input.startAt, total: lines.reduce((sum, line) => sum + line.price, 0) };
  }

  async confirm(userId: string, token: string) {
    await this.requireCustomer(userId);
    const claims = this.codec().verify(token, userId);
    const booking = await this.bookings.bookAppointmentTx(
      { userId, role: Role.CUSTOMER },
      { petId: claims.petId, serviceIds: claims.serviceIds, startAt: claims.startAt },
      undefined,
      { id: claims.confirmationId, expectedState: claims.expectedState },
    );
    return { id: booking.id, code: booking.code, total: booking.total, startAt: booking.startAt, status: booking.statusV2, isPaid: booking.isPaid };
  }
}
