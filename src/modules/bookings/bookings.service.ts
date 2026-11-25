import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BookingSource,
  BookingStatus,
  BookingStatusV2,
  ServiceCategory,
  BookingType,
  Prisma,
  Role,
  Species,
} from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { requestFingerprint } from '../../common/idempotency.js';
import { bookingQuoteFingerprint } from './booking-confirmation.js';
import { getBookingStatusLabel } from './booking-status-labels.js';
import { MailService } from '../../common/mail/mail.service.js';
import { ServicesService } from '../services/services.service.js';
import {
  ChangeStatusDto,
  CreateBookingV2Dto,
  QueryAvailableSlotsDto,
  RescheduleBookingDto,
} from './dto/create-booking-v2.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import {
  AssignStaffDto,
  CreateBookingReweighQuoteDto,
  DecideBookingReweighDto,
  QueryBookingDto,
  UpdateBookingAddonsDto,
  UpdateBookingStatusDto,
} from './dto/update-booking.dto.js';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto.js';
import {
  checkStartSlotCapacity,
  formatVnDate,
  formatVnTime,
  isShiftHandoverStartTime,
  parseVnTime,
  roundUpToNextStartSlot,
  SHIFT_HANDOVER_START_ERROR,
} from './bookings-v2.utils.js';

/** Tạo mã booking dạng BK-2026-XXXX */
function generateBookingCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${year}-${rand}`;
}

type ReweighServicePrice = {
  serviceId: string;
  sizeTierId: string;
  priceFrom: number;
};

type WeightPriceTier = {
  minWeight: number;
  maxWeight: number;
  price: number;
  species: Species | null;
};

function findWeightPriceTier(
  priceTiers: WeightPriceTier[],
  species: Species,
  weightKg: number,
): WeightPriceTier | null {
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 20) return null;

  const exactSpeciesTiers = priceTiers.filter((tier) => tier.species === species);
  const applicableTiers = exactSpeciesTiers.length > 0
    ? exactSpeciesTiers
    : priceTiers.filter((tier) => tier.species === null);
  const supportedTiers = applicableTiers
    .filter((tier) => tier.minWeight < 20)
    .sort((left, right) => left.minWeight - right.minWeight);
  const lastTierIndex = supportedTiers.length - 1;
  const matchingTiers = supportedTiers.filter((tier, index) => {
    const tierMaxWeight = Math.min(tier.maxWeight, 20);
    return weightKg >= tier.minWeight && (
      weightKg < tierMaxWeight ||
      (index === lastTierIndex && tierMaxWeight === 20 && weightKg === 20)
    );
  });

  return matchingTiers.length === 1 ? matchingTiers[0] : null;
}

function findSizeTierAtWeight<T extends { minKg: number; maxKg: number }>(
  sizeTiers: T[],
  weightKg: number,
): T | null {
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 20) return null;

  const matchingTiers = sizeTiers.filter((tier) => {
    const tierMaxKg = Math.min(tier.maxKg, 20);
    return weightKg >= tier.minKg && (
      weightKg < tierMaxKg ||
      (weightKg === 20 && tierMaxKg === 20 && tier.minKg < 20)
    );
  });

  return matchingTiers.length === 1 ? matchingTiers[0] : null;
}

/** Định nghĩa state machine — ai được chuyển trạng thái nào */
const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.READY_FOR_PICKUP],
  [BookingStatus.READY_FOR_PICKUP]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private servicesService: ServicesService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  private assertCustomerBookingSelfServiceWindow(
    startAt: Date | null,
    cancelBeforeHours: number,
    action: 'hủy' | 'đổi giờ',
  ) {
    if (!startAt) {
      throw new BadRequestException(
        'Không xác định được giờ hẹn. Vui lòng liên hệ cửa hàng để được hỗ trợ.',
      );
    }

    const earliestSelfServiceAt = new Date(Date.now() + cancelBeforeHours * 60 * 60 * 1000);
    if (startAt < earliestSelfServiceAt) {
      throw new BadRequestException(
        `Bạn chỉ có thể tự ${action} trước giờ hẹn ít nhất ${cancelBeforeHours} giờ. Vui lòng liên hệ cửa hàng để được hỗ trợ.`,
      );
    }
  }

  private get bookingInclude() {
    return {
      customer: true,
      pet: true,
      services: { include: { service: true } },
      timeSlot: true,
      assignedStaff: true,
      statusLogs: true,
      transactions: true,
      voucherUsage: { include: { voucher: true } },
    };
  }

  private async buildReweighQuote(
    tx: Prisma.TransactionClient,
    bookingId: string,
    weightKg: number,
  ) {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { pet: true, services: { include: { service: { include: { priceTiers: true } } } } },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    if (!booking.startAt) throw new BadRequestException('Lịch hẹn chưa có giờ bắt đầu.');

    const current = {
      subtotal: booking.subtotal,
      total: booking.total,
    };

    const unsupported = (reason: string) => ({
      quote: {
        supported: false as const,
        reason,
        weightKg,
        current,
        proposed: null,
      },
      servicePrices: [] as ReweighServicePrice[],
    });

    if (weightKg > 20) {
      return unsupported('Rất tiếc, dịch vụ này hiện chỉ nhận thú cưng đến tối đa 20 kg.');
    }

    const activeSizeTiers = await tx.sizeTier.findMany({ where: { active: true } });
    const sizeTier = findSizeTierAtWeight(activeSizeTiers, weightKg);
    if (!sizeTier) {
      return unsupported('Rất tiếc, PetCare chưa thể nhận thú cưng ở mức cân nặng này.');
    }

    const servicePrices: ReweighServicePrice[] = [];
    for (const bookingService of booking.services) {
      const priceTier = findWeightPriceTier(
        bookingService.service.priceTiers,
        booking.pet.species,
        weightKg,
      );
      if (!priceTier) {
        return unsupported('Rất tiếc, PetCare chưa thể nhận thú cưng ở mức cân nặng này cho dịch vụ đã chọn.');
      }
      servicePrices.push({
        serviceId: bookingService.serviceId,
        sizeTierId: sizeTier.id,
        priceFrom: priceTier.price,
      });
    }
    const priceByServiceId = new Map(servicePrices.map((item) => [item.serviceId, item]));

    const proposedSubtotal = booking.services.reduce(
      (total, item) => total + priceByServiceId.get(item.serviceId)!.priceFrom,
      0,
    );
    const proposedTotal = Math.max(0, proposedSubtotal + booking.extraPrice - booking.discount);
    return {
      quote: {
        supported: true as const,
        reason: null,
        weightKg,
        current,
        proposed: {
          subtotal: proposedSubtotal,
          total: proposedTotal,
          sizeTierId: sizeTier.id,
          sizeTierName: sizeTier.name,
        },
      },
      servicePrices: servicePrices.map(({ serviceId, sizeTierId, priceFrom }) => ({
        serviceId,
        sizeTierId,
        priceFrom,
      })),
    };
  }

  async createReweighQuote(
    bookingId: string,
    userContext: { userId: string; role: Role },
    dto: CreateBookingReweighQuoteDto,
  ) {
    if (userContext.role !== Role.STAFF && userContext.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc nhân viên được cập nhật cân nặng lịch hẹn.');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
      if (booking.type !== BookingType.SPA || booking.statusV2 !== BookingStatusV2.ARRIVED) {
        throw new BadRequestException('Chỉ cập nhật cân nặng khi lịch Spa đã được tiếp nhận và chưa bắt đầu dịch vụ.');
      }
      if (booking.isPaid) throw new BadRequestException('Lịch đã thanh toán nên không thể cập nhật giá.');
      if (!booking.startAt) throw new BadRequestException('Lịch hẹn chưa có giờ bắt đầu.');

      const vnDateStr = formatVnDate(booking.startAt);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('appt:' || ${vnDateStr}))`;
      const currentBooking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (
        !currentBooking ||
        currentBooking.type !== BookingType.SPA ||
        currentBooking.statusV2 !== BookingStatusV2.ARRIVED ||
        currentBooking.isPaid ||
        !currentBooking.startAt
      ) {
        throw new ConflictException('Lịch đã thay đổi trạng thái. Tải lại lịch rồi thử lại.');
      }
      await tx.petProfile.update({ where: { id: currentBooking.petId }, data: { weightKg: dto.weightKg } });
      const { quote, servicePrices } = await this.buildReweighQuote(tx, bookingId, dto.weightKg);
      if (quote.supported && quote.proposed) {
        const priceByServiceId = new Map(servicePrices.map((item) => [item.serviceId, item]));
        const bookingServices = await tx.bookingService.findMany({ where: { bookingId } });
        if (bookingServices.some((item) => !priceByServiceId.has(item.serviceId))) {
          throw new ConflictException('Bảng giá vừa thay đổi. Tải lại lịch rồi thử lại.');
        }
        for (const item of bookingServices) {
          const price = priceByServiceId.get(item.serviceId)!;
          await tx.bookingService.update({
            where: { id: item.id },
            data: { sizeTierId: price.sizeTierId, priceApplied: price.priceFrom },
          });
        }
        await tx.booking.update({
          where: { id: bookingId },
          data: { subtotal: quote.proposed.subtotal, total: quote.proposed.total },
        });
      }

      await tx.bookingStatusLog.create({
        data: {
          bookingId,
          fromStatus: BookingStatusV2.ARRIVED,
          toStatus: BookingStatusV2.ARRIVED,
          action: quote.supported ? 'ACTUAL_WEIGHT_UPDATED' : 'WEIGHT_RECHECK_UNSUPPORTED',
          staffId: userContext.userId,
          reason: quote.supported
            ? 'Đã cập nhật cân nặng thực tế và tự tính lại giá lịch hẹn.'
            : quote.reason,
          meta: {
            weightKg: dto.weightKg,
            supported: quote.supported,
            previousSubtotal: currentBooking.subtotal,
            newSubtotal: quote.proposed?.subtotal ?? currentBooking.subtotal,
            previousTotal: currentBooking.total,
            newTotal: quote.proposed?.total ?? currentBooking.total,
            proposedSubtotal: quote.proposed?.subtotal ?? null,
            proposedTotal: quote.proposed?.total ?? null,
            proposedSizeTierId: quote.proposed?.sizeTierId ?? null,
            proposedServices: servicePrices
              .map((item) => ({ ...item }))
              .sort((left, right) => left.serviceId.localeCompare(right.serviceId)),
          },
        },
      });

      return quote;
    });
  }

  async decideReweigh(
    bookingId: string,
    userContext: { userId: string; role: Role },
    dto: DecideBookingReweighDto,
  ) {
    if (userContext.role !== Role.STAFF && userContext.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc nhân viên được xác nhận báo giá cân lại.');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
      if (booking.type !== BookingType.SPA || booking.statusV2 !== BookingStatusV2.ARRIVED) {
        throw new BadRequestException('Lịch không còn ở bước tiếp nhận cân tại quầy.');
      }
      if (booking.isPaid) throw new BadRequestException('Lịch đã thanh toán nên không thể đổi báo giá.');
      if (!booking.startAt) throw new BadRequestException('Lịch hẹn chưa có giờ bắt đầu.');

      const vnDateStr = formatVnDate(booking.startAt);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('appt:' || ${vnDateStr}))`;

      const latestReweigh = await tx.bookingStatusLog.findFirst({
        where: {
          bookingId,
          action: {
            in: [
              'WEIGHT_RECHECK_PENDING',
              'WEIGHT_RECHECK_UNSUPPORTED',
              'ACTUAL_WEIGHT_UPDATED',
              'WEIGHT_RECHECK_ACCEPTED',
              'WEIGHT_RECHECK_DECLINED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const pendingWeight = Number((latestReweigh?.meta as any)?.weightKg);
      if (
        latestReweigh?.action !== 'WEIGHT_RECHECK_PENDING' ||
        !Number.isFinite(pendingWeight) ||
        Math.abs(pendingWeight - dto.weightKg) > 0.000001
      ) {
        throw new ConflictException('Số cân đã thay đổi hoặc báo giá đã hết hiệu lực. Vui lòng cân lại và tính báo giá mới.');
      }

      const pet = await tx.petProfile.findUnique({ where: { id: booking.petId }, select: { weightKg: true } });
      if (!pet || Math.abs(pet.weightKg - dto.weightKg) > 0.000001) {
        throw new ConflictException('Cân nặng hồ sơ đã thay đổi. Vui lòng cân lại và tính báo giá mới.');
      }

      const { quote, servicePrices } = await this.buildReweighQuote(tx, bookingId, dto.weightKg);
      const pendingMeta = latestReweigh.meta as Record<string, any> | null;
      if (dto.decision === 'DECLINE') {
        await tx.bookingStatusLog.create({
          data: {
            bookingId,
            fromStatus: BookingStatusV2.ARRIVED,
            toStatus: BookingStatusV2.ARRIVED,
            action: 'WEIGHT_RECHECK_DECLINED',
            staffId: userContext.userId,
            reason: 'Khách chưa đồng ý với giá theo cân nặng thực tế.',
            meta: {
              weightKg: dto.weightKg,
              previousTotal: booking.total,
              proposedTotal: pendingMeta?.proposedTotal ?? null,
            },
          },
        });
        return tx.booking.findUnique({ where: { id: bookingId }, include: this.bookingInclude });
      }

      if (!quote.supported || !quote.proposed) {
        throw new BadRequestException(quote.reason ?? 'Không thể nhận dịch vụ ở cân nặng này.');
      }
      const acceptedServices = Array.isArray(pendingMeta?.proposedServices) ? pendingMeta.proposedServices : [];
      const acceptedServiceById = new Map(acceptedServices.map((item: any) => [item.serviceId, item]));
      const serviceOfferMatches =
        acceptedServices.length === servicePrices.length &&
        servicePrices.every((item) => {
          const accepted = acceptedServiceById.get(item.serviceId) as any;
          return accepted &&
            accepted.sizeTierId === item.sizeTierId &&
            accepted.priceFrom === item.priceFrom;
        });
      if (
        pendingMeta?.proposedSubtotal !== quote.proposed.subtotal ||
        pendingMeta?.proposedTotal !== quote.proposed.total ||
        pendingMeta?.proposedSizeTierId !== quote.proposed.sizeTierId ||
        !serviceOfferMatches
      ) {
        throw new ConflictException('Bảng giá đã thay đổi sau khi báo khách. Vui lòng cân lại, tính báo giá mới và xác nhận lại với khách.');
      }

      const priceByServiceId = new Map(servicePrices.map((item) => [item.serviceId, item]));
      const bookingServices = await tx.bookingService.findMany({ where: { bookingId } });
      if (bookingServices.some((item) => !priceByServiceId.has(item.serviceId))) {
        throw new ConflictException('Bảng giá vừa thay đổi. Vui lòng cân lại và tính báo giá mới.');
      }
      for (const item of bookingServices) {
        const price = priceByServiceId.get(item.serviceId)!;
        await tx.bookingService.update({
          where: { id: item.id },
          data: {
            sizeTierId: price.sizeTierId,
            priceApplied: price.priceFrom,
          },
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          subtotal: quote.proposed.subtotal,
          total: quote.proposed.total,
        },
      });
      await tx.bookingStatusLog.create({
        data: {
          bookingId,
          fromStatus: BookingStatusV2.ARRIVED,
          toStatus: BookingStatusV2.ARRIVED,
          action: 'WEIGHT_RECHECK_ACCEPTED',
          staffId: userContext.userId,
          reason: 'Khách đồng ý với giá theo cân nặng thực tế.',
          meta: {
            weightKg: dto.weightKg,
            sizeTierId: quote.proposed.sizeTierId,
            sizeTierName: quote.proposed.sizeTierName,
            previousSubtotal: booking.subtotal,
            newSubtotal: quote.proposed.subtotal,
            previousTotal: booking.total,
            newTotal: quote.proposed.total,
            forcedOverbook: false,
          },
        },
      });

      return tx.booking.findUnique({ where: { id: bookingId }, include: this.bookingInclude });
    });
  }

  private async findIdempotentBooking(key: string, fingerprint: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { idempotencyKey: key },
      include: this.bookingInclude,
    });
    if (!booking) return null;
    if (booking.idempotencyHash !== fingerprint) {
      throw new ConflictException('Mã yêu cầu này đã được dùng cho nội dung khác. Hãy tải lại thao tác rồi thử lại.');
    }
    return booking;
  }

  async create(requesterId: string, requesterRole: Role = Role.CUSTOMER, dto: CreateBookingDto, idempotencyKey?: string) {
    const fingerprint = idempotencyKey
      ? requestFingerprint('spa-booking-v1', requesterId, { requesterRole, dto })
      : undefined;
    if (idempotencyKey && fingerprint) {
      const existing = await this.findIdempotentBooking(idempotencyKey, fingerprint);
      if (existing) return existing;
    }
    try {
      return await this.createLegacyBooking(requesterId, requesterRole, dto, idempotencyKey, fingerprint);
    } catch (error) {
      if (idempotencyKey && fingerprint) {
        const existing = await this.findIdempotentBooking(idempotencyKey, fingerprint);
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async createLegacyBooking(
    requesterId: string,
    requesterRole: Role,
    dto: CreateBookingDto,
    idempotencyKey?: string,
    fingerprint?: string,
  ) {
    if (dto.type !== BookingType.SPA) {
      throw new BadRequestException('Loại lịch hẹn không hợp lệ.');
    }

    // 1. Validate pet ownership or reception intake
    const pet = await this.prisma.petProfile.findUnique({ where: { id: dto.petId } });
    if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
    if (pet.archivedAt) {
      throw new BadRequestException('Hồ sơ thú cưng đã lưu trữ, vui lòng liên hệ cửa hàng để khôi phục trước khi đặt lịch.');
    }

    let targetCustomerId = requesterId;
    if (requesterRole === Role.CUSTOMER) {
      if (pet.userId !== requesterId) {
        throw new ForbiddenException('Thú cưng này không thuộc tài khoản của bạn.');
      }
    } else {
      if (!dto.customerId) {
        throw new BadRequestException('Vui lòng chọn tài khoản khách hàng trước khi tạo lịch.');
      }
      const customer = await this.prisma.user.findFirst({
        where: {
          id: dto.customerId,
          role: Role.CUSTOMER,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!customer) {
        throw new BadRequestException('Tài khoản khách hàng không tồn tại hoặc đang bị khóa.');
      }
      if (pet.userId !== customer.id) {
        throw new BadRequestException('Thú cưng không thuộc khách hàng đã chọn.');
      }
      targetCustomerId = customer.id;
    }

    // 2. Snapshot giá cho từng service
    const priceResults = await Promise.all(
      dto.serviceIds.map((sid) => this.servicesService.calculatePrice(sid, dto.petId)),
    );

    let subtotal = priceResults.reduce((acc, r) => acc + r.priceApplied, 0);

    // SPA: check slot capacity or auto-assign for counter reception
    let targetTimeSlotId = dto.timeSlotId;
    if (!targetTimeSlotId) {
      if (requesterRole === Role.CUSTOMER) {
        throw new BadRequestException('Cần chọn khung giờ cho lịch Spa.');
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let availableSlot = await this.prisma.timeSlot.findFirst({
        where: { slotDate: today, booked: { lt: 10 } },
        orderBy: { slotTime: 'asc' },
      });
      if (!availableSlot) {
        availableSlot = await this.prisma.timeSlot.create({
          data: {
            slotDate: today,
            slotTime: '08:30',
            period: 'MORNING' as any,
            capacity: 10,
            booked: 0,
          },
        });
      }
      targetTimeSlotId = availableSlot.id;
    }

    const slot = await this.prisma.timeSlot.findUnique({ where: { id: targetTimeSlotId } });
    if (!slot) throw new NotFoundException('Không tìm thấy khung giờ.');
    if (isShiftHandoverStartTime(slot.slotTime)) {
      throw new BadRequestException(SHIFT_HANDOVER_START_ERROR);
    }
    if (requesterRole === Role.CUSTOMER && slot.booked >= slot.capacity) {
      throw new BadRequestException('Khung giờ đã đầy. Vui lòng chọn giờ khác.');
    }
    // 3. Đặt lịch online là giữ chỗ — không trừ voucher tại đây
    // Voucher và điểm tích lũy sẽ được áp dụng khi thanh toán thực tế tại quầy
    const discount = 0;
    const total = subtotal;

    // 4. Tạo booking trong transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const promotionSettings = await tx.shopSettings.findUnique({
        where: { id: 'singleton' },
        select: { spaBookingPromotionActive: true },
      });
      const newBooking = await tx.booking.create({
        data: {
          idempotencyKey,
          idempotencyHash: fingerprint,
          code: generateBookingCode(),
          type: dto.type,
          source: requesterRole === Role.CUSTOMER ? BookingSource.WEB : BookingSource.RECEPTIONIST,
          customerId: targetCustomerId,
          petId: dto.petId,
          timeSlotId: targetTimeSlotId,
          status: BookingStatus.CONFIRMED,
          subtotal,
          discount,
          total,
          spaBookingPromotionEligible:
            dto.type === BookingType.SPA && requesterRole === Role.CUSTOMER &&
            (promotionSettings?.spaBookingPromotionActive ?? false),
          assignedStaffId: dto.assignedStaffId,
          staffNote: dto.staffNote,
          services: {
            create: priceResults.map((r) => ({
              serviceId: r.serviceId,
              priceApplied: r.priceApplied,
            })),
          },
        },
        include: this.bookingInclude,
      });

      // Tăng booked count cho slot Spa
      if (dto.type === BookingType.SPA && targetTimeSlotId) {
        await tx.timeSlot.update({
          where: { id: targetTimeSlotId },
          data: { booked: { increment: 1 } },
        });
      }

      // Tạo notification
      await tx.notification.create({
        data: {
          userId: targetCustomerId,
          title: 'Đặt lịch thành công',
          body: `Mã đặt lịch của bạn: ${newBooking.code}. Vui lòng đến đúng giờ hẹn.`,
          type: 'BOOKING',
          refId: newBooking.id,
        },
      });

      return newBooking;
    });

    if (booking.customer?.email) {
      const dateTime = booking.startAt
        ? `${formatVnDate(booking.startAt)} ${formatVnTime(booking.startAt)}`
        : booking.timeSlot
          ? `${formatVnDate(booking.timeSlot.slotDate)} ${booking.timeSlot.slotTime}`
          : 'Vui lòng xem giờ hẹn trong tài khoản PetCare';
      await this.mailService?.sendBusinessNotificationEmail(
        booking.customer.email,
        'Xác nhận đặt lịch Spa PetCare',
        `Lịch hẹn ${booking.code} cho bé ${booking.pet.name} đã được tạo. Giờ hẹn: ${dateTime}. Vui lòng đến đúng giờ.`,
      );
    }

    return booking;
  }

  async findMyBookings(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminScheduleSettings() {
    const settings = await this.prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) throw new InternalServerErrorException('Chưa có cấu hình giờ hoạt động và công suất. Vui lòng liên hệ bộ phận hỗ trợ.');
    return settings;
  }

  async getSpaBookingPromotion() {
    const settings = await this.prisma.shopSettings.findUnique({
      where: { id: 'singleton' },
      select: { spaBookingPromotionActive: true },
    });
    if (!settings) throw new InternalServerErrorException('Chưa có cấu hình ưu đãi Spa. Vui lòng liên hệ bộ phận hỗ trợ.');
    return { active: settings.spaBookingPromotionActive };
  }

  async updateSpaBookingPromotion(active: boolean) {
    const settings = await this.prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: { spaBookingPromotionActive: active },
      select: { spaBookingPromotionActive: true },
    });
    return { active: settings.spaBookingPromotionActive };
  }

  async updateAdminScheduleSettings(dto: UpdateShopSettingsDto) {
    for (const day of Object.keys(dto.openHours)) {
      if (!/^[1-7]$/.test(day)) {
        throw new BadRequestException('Ngày trong tuần phải nằm trong khoảng 1 đến 7.');
      }
      const hours = dto.openHours[day];
      if (hours === null) continue;
      if (!hours || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.close)) {
        throw new BadRequestException('Giờ mở và đóng cửa phải theo định dạng HH:mm.');
      }
      if (hours.open >= hours.close) {
        throw new BadRequestException('Giờ đóng cửa phải sau giờ mở cửa trong cùng ngày.');
      }
    }

    if (Object.keys(dto.openHours).length !== 7) {
      throw new BadRequestException('Cần cấu hình đủ giờ hoạt động cho cả 7 ngày trong tuần.');
    }
    const uniqueHolidays = [...new Set(dto.holidays)];
    if (uniqueHolidays.some((date) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date;
    })) {
      throw new BadRequestException('Ngày nghỉ phải theo định dạng YYYY-MM-DD.');
    }

    return this.prisma.shopSettings.update({
      where: { id: 'singleton' },
      data: {
        capacity: dto.capacity,
        latePickupFeeAmount: dto.latePickupFeeAmount,
        openHours: dto.openHours as Prisma.InputJsonValue,
        holidays: uniqueHolidays,
      },
    });
  }

  async findToday() {
    const todayLabel = formatVnDate(new Date());
    const today = new Date(`${todayLabel}T00:00:00+07:00`);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.booking.findMany({
      where: {
        OR: [
          { timeSlot: { slotDate: { gte: today, lt: tomorrow } } },
          { startAt: { gte: today, lt: tomorrow } },
        ],
      },
      include: this.bookingInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAll(query: QueryBookingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};
    const filters: Prisma.BookingWhereInput[] = [];
    if (query.type) filters.push({ type: query.type });
    if (query.status) filters.push({ status: query.status });

    const legacyStatusByFilter: Partial<Record<string, BookingStatus[]>> = {
      WAITING_CHECKIN: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      IN_PROGRESS: [BookingStatus.IN_PROGRESS],
      READY_FOR_PICKUP: [BookingStatus.READY_FOR_PICKUP],
      COMPLETED: [BookingStatus.COMPLETED],
      CANCELLED: [BookingStatus.CANCELLED],
      CANCELLED_OR_NO_SHOW: [BookingStatus.CANCELLED],
    };
    const statusV2ByFilter: Partial<Record<string, BookingStatusV2>> = {
      WAITING_CHECKIN: BookingStatusV2.BOOKED,
      ARRIVED: BookingStatusV2.ARRIVED,
      IN_PROGRESS: BookingStatusV2.IN_SERVICE,
      READY_FOR_PICKUP: BookingStatusV2.READY_FOR_PICKUP,
      COMPLETED: BookingStatusV2.DONE,
      CANCELLED: BookingStatusV2.CANCELLED,
      NO_SHOW: BookingStatusV2.NO_SHOW,
    };
    if (query.statusFilter) {
      const statusConditions: Prisma.BookingWhereInput[] = [];
      const statusV2 = statusV2ByFilter[query.statusFilter];
      if (statusV2) statusConditions.push({ statusV2 });
      if (query.statusFilter === 'CANCELLED_OR_NO_SHOW') {
        statusConditions.push({ statusV2: { in: [BookingStatusV2.CANCELLED, BookingStatusV2.NO_SHOW] } });
      }
      const legacyStatuses = legacyStatusByFilter[query.statusFilter];
      if (legacyStatuses?.length) {
        statusConditions.push({ statusV2: null, status: { in: legacyStatuses } });
      }
      filters.push({ OR: statusConditions });
    }

    if (query.dateFrom || query.dateTo) {
      const from = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00+07:00`) : undefined;
      const to = query.dateTo ? new Date(`${query.dateTo}T00:00:00+07:00`) : undefined;
      if (from && to && from >= to) {
        throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
      }
      const startAt: Prisma.DateTimeNullableFilter = {
        ...(from && { gte: from }),
        ...(to && { lt: to }),
      };
      const slotDate: Prisma.DateTimeFilter = {
        ...(from && { gte: from }),
        ...(to && { lt: to }),
      };
      filters.push({ OR: [
        { startAt },
        { startAt: null, timeSlot: { slotDate } },
      ] });
    }

    const search = query.q?.trim();
    if (search) {
      filters.push({ OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
        { pet: { name: { contains: search, mode: 'insensitive' } } },
        { pet: { breed: { contains: search, mode: 'insensitive' } } },
      ] });
    }
    if (filters.length === 1) Object.assign(where, filters[0]);
    if (filters.length > 1) where.AND = filters;

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: this.bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data: bookings, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByCode(code: string, requesterId: string, requesterRole: Role) {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: this.bookingInclude,
    });

    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');

    if (requesterRole === Role.CUSTOMER && booking.customerId !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch hẹn này.');
    }

    return booking;
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    userContext?: { userId: string; role: Role },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { customer: true, pet: true },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    if (booking.statusV2) {
      throw new BadRequestException('Hãy mở lại chi tiết lịch để thực hiện bước tiếp theo.');
    }

    const allowed = STATUS_TRANSITIONS[booking.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển lịch từ ${getBookingStatusLabel(booking.status)} sang ${getBookingStatusLabel(dto.status)}.`,
      );
    }
    if (
      dto.status === BookingStatus.COMPLETED &&
      ((!booking.isPaid && booking.total > 0) || (booking.latePickupFeeAmount > 0 && !booking.latePickupFeePaidAt))
    ) {
      throw new BadRequestException('Chỉ có thể hoàn tất lịch sau khi đã thu đủ tiền dịch vụ và phí chăm giữ (nếu có).');
    }

    let updated;
    if (dto.status === BookingStatus.CANCELLED) {
      updated = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.booking.updateMany({
          where: { id: booking.id, status: booking.status, statusV2: null },
          data: {
            status: dto.status,
            ...(dto.staffNote && { staffNote: dto.staffNote }),
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException('Lịch đã được cập nhật ở nơi khác. Hãy tải lại để kiểm tra.');
        }

        if (booking.timeSlotId) {
          await tx.timeSlot.update({
            where: { id: booking.timeSlotId },
            data: { booked: { decrement: 1 } },
          });
        }

        await tx.bookingStatusLog.create({
          data: {
            bookingId: booking.id,
            fromStatus: null,
            toStatus: BookingStatusV2.CANCELLED,
            action: 'CANCEL',
            staffId: userContext?.role === Role.CUSTOMER ? null : userContext?.userId ?? null,
            reason: dto.reason?.trim() || (userContext?.role === Role.CUSTOMER
              ? 'Khách hàng hủy lịch; không cung cấp lý do cụ thể.'
              : userContext
                ? 'Nhân viên hủy lịch; không cung cấp lý do cụ thể.'
                : 'Lịch bị hủy qua luồng cũ; không có thông tin người thực hiện.'),
          },
        });

        const result = await tx.booking.findUnique({
          where: { id: booking.id },
          include: this.bookingInclude,
        });
        if (!result) throw new NotFoundException('Không tìm thấy lịch hẹn sau khi cập nhật.');
        return result;
      });
    } else {
      updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: dto.status,
          ...(dto.staffNote && { staffNote: dto.staffNote }),
        },
        include: this.bookingInclude,
      });
    }
    if (booking.customer?.email && dto.status === BookingStatus.CANCELLED) {
      await this.mailService?.sendBusinessNotificationEmail(
        booking.customer.email,
        'Lịch hẹn Spa PetCare đã hủy',
        `Lịch hẹn ${updated.code} cho bé ${updated.pet.name} đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ PetCare.`,
      );
    } else if (booking.customer?.email && dto.status === BookingStatus.READY_FOR_PICKUP) {
      await this.mailService?.sendBusinessNotificationEmail(
        booking.customer.email,
        'Thú cưng đã sẵn sàng nhận tại PetCare',
        `Bé ${updated.pet.name} đã hoàn tất dịch vụ trong lịch ${updated.code} và sẵn sàng để bạn đến nhận.`,
      );
    }
    return updated;
  }

  async updateAddons(id: string, dto: UpdateBookingAddonsDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { pet: true } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    const canEditV2 = booking.statusV2
      ? new Set<BookingStatusV2>([BookingStatusV2.BOOKED, BookingStatusV2.ARRIVED, BookingStatusV2.IN_SERVICE]).has(booking.statusV2)
      : false;
    const canEditLegacy = !booking.statusV2 &&
      new Set<BookingStatus>([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]).has(booking.status);
    if (!canEditV2 && !canEditLegacy) {
      throw new BadRequestException('Chỉ có thể thêm hoặc gỡ dịch vụ khi lịch còn chờ tiếp nhận hoặc đang làm.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Xóa addon được chỉ định
      if (dto.removeBookingServiceIds?.length) {
        const removed = await tx.bookingService.deleteMany({
          where: {
            id: { in: dto.removeBookingServiceIds },
            bookingId: id,
            service: { isAddon: true },
          },
        });
        if (removed.count !== new Set(dto.removeBookingServiceIds).size) {
          throw new BadRequestException('Không tìm thấy dịch vụ thêm trên lịch này. Hãy tải lại lịch rồi thử lại.');
        }
      }

      // Thêm addon mới — snapshot giá
      if (dto.addServiceIds?.length) {
        const prices = await Promise.all(
          dto.addServiceIds.map((sid) => this.servicesService.calculatePrice(sid, booking.petId)),
        );
        await tx.bookingService.createMany({
          data: prices.map((p) => ({
            bookingId: id,
            serviceId: p.serviceId,
            priceApplied: p.priceApplied,
          })),
        });
      }

      // Tính lại tổng tiền
      const allServices = await tx.bookingService.findMany({ where: { bookingId: id } });
      const newSubtotal = allServices.reduce((acc, s) => acc + s.priceApplied, 0);
      await tx.booking.update({
        where: { id },
        data: { subtotal: newSubtotal, total: Math.max(0, newSubtotal - booking.discount) },
      });
    });

    return this.prisma.booking.findUnique({ where: { id }, include: this.bookingInclude });
  }

  async acceptWaiver(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    if (booking.statusV2 && new Set<BookingStatusV2>([BookingStatusV2.DONE, BookingStatusV2.CANCELLED, BookingStatusV2.NO_SHOW]).has(booking.statusV2)) {
      throw new BadRequestException('Không thể cập nhật phiếu đã kết thúc.');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { waiverAcceptedAt: new Date() },
    });
  }

  async assignStaff(id: string, dto: AssignStaffDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
    if (booking.statusV2 && new Set<BookingStatusV2>([BookingStatusV2.DONE, BookingStatusV2.CANCELLED, BookingStatusV2.NO_SHOW]).has(booking.statusV2)) {
      throw new BadRequestException('Không thể phân công cho phiếu đã kết thúc.');
    }

    const staff = await this.prisma.user.findUnique({ where: { id: dto.staffId } });
    if (!staff || (staff.role !== Role.STAFF && staff.role !== Role.ADMIN)) {
      throw new BadRequestException('Người dùng này không phải nhân viên.');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { assignedStaffId: dto.staffId },
    });
  }

  async cancel(id: string, requesterId: string, requesterRole: Role, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');

    // Customer chỉ hủy được booking của mình
    if (requesterRole === Role.CUSTOMER && booking.customerId !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền hủy lịch hẹn này.');
    }

    if (booking.statusV2) {
      const cancellationReason = reason?.trim() || undefined;
      return this.changeStatusV2(
        id,
        { userId: requesterId, role: requesterRole },
        { fromStatus: booking.statusV2, toStatus: BookingStatusV2.CANCELLED, reason: cancellationReason },
      );
    }

    const cancellableStatuses: string[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException('Chỉ có thể hủy khi lịch đang ở trạng thái Đã đặt.');
    }

    return this.updateStatus(
      id,
      { status: BookingStatus.CANCELLED, reason },
      { userId: requesterId, role: requesterRole },
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // BOOKING V2: weight-based pricing and start-slot capacity
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Tạo lịch hẹn mới V2 (hoặc Walk-in) qua PostgreSQL Advisory Lock theo ngày.
   * Server tự tra cứu nhóm cân nặng và bậc giá từ DB; client không gửi giá.
   * Công suất đếm theo khung giờ bắt đầu, không giữ chỗ theo thời lượng dịch vụ.
   */
  async bookAppointmentTx(
    userContext: { userId: string; role: Role },
    dto: CreateBookingV2Dto,
    excludeBookingId?: string,
    confirmation?: { id: string; expectedState: string },
    idempotencyKey?: string,
  ) {
    let replayed = false;
    const idempotencyHash = idempotencyKey
      ? requestFingerprint('spa-booking-v2', userContext.userId, dto)
      : undefined;
    const isStaff = userContext.role === Role.STAFF || userContext.role === Role.ADMIN;
    const source = isStaff ? (dto.source ?? BookingSource.RECEPTIONIST) : BookingSource.WEB;
    if (dto.capacityOverrideReason !== undefined && !isStaff) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc nhân viên được nhận thêm khi đã đủ chỗ.');
    }
    const capacityOverrideReason = dto.capacityOverrideReason?.trim();
    if (capacityOverrideReason && source !== BookingSource.WALK_IN) {
      throw new BadRequestException('Chỉ có thể ghi đè công suất khi tiếp nhận khách walk-in.');
    }
    try {
      const booking = await this.prisma.$transaction(
        async (tx) => {
          if (idempotencyKey && idempotencyHash) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking-create:${idempotencyKey}`}))`;
            const existing = await tx.booking.findUnique({
              where: { idempotencyKey },
              include: { services: { include: { service: true, sizeTier: true } }, pet: true, customer: true, statusLogs: true },
            });
            if (existing) {
              if (existing.idempotencyHash !== idempotencyHash) {
                throw new ConflictException('Mã yêu cầu này đã được dùng cho nội dung khác. Hãy tải lại thao tác rồi thử lại.');
              }
              replayed = true;
              return existing;
            }
          }
          if (confirmation) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-confirm:${confirmation.id}`}))`;
            const existing = await tx.booking.findUnique({
              where: { aiConfirmationId: confirmation.id },
              include: { services: { include: { service: true, sizeTier: true } }, pet: true, customer: true, statusLogs: true },
            });
            if (existing) {
              if (existing.customerId !== userContext.userId) throw new ForbiddenException('Xác nhận không thuộc tài khoản của bạn.');
              replayed = true;
              return existing;
            }
          }
          // 1. Xác thực quyền sở hữu thú cưng
          const pet = await tx.petProfile.findUnique({
            where: { id: dto.petId },
          });
          if (!pet) {
            throw new BadRequestException('Thú cưng không tồn tại');
          }
          if (pet.archivedAt) {
            throw new BadRequestException('Hồ sơ thú cưng đã lưu trữ, vui lòng liên hệ cửa hàng để khôi phục trước khi đặt lịch.');
          }

          let customerId = userContext.userId;
          if (isStaff) {
            if (!dto.customerId) {
              throw new BadRequestException('Vui lòng chọn tài khoản khách hàng trước khi tạo lịch.');
            }
            const customer = await tx.user.findFirst({
              where: {
                id: dto.customerId,
                role: Role.CUSTOMER,
                isActive: true,
                deletedAt: null,
              },
              select: { id: true },
            });
            if (!customer) {
              throw new BadRequestException('Tài khoản khách hàng không tồn tại hoặc đang bị khóa.');
            }
            if (pet.userId !== customer.id) {
              throw new BadRequestException('Thú cưng không thuộc khách hàng đã chọn.');
            }
            customerId = customer.id;
          } else if (pet.userId !== userContext.userId) {
            throw new BadRequestException('Thú cưng không thuộc quyền sở hữu của khách');
          }

          // 2. Xác định giờ bắt đầu và chuẩn hóa múi giờ VN (Asia/Ho_Chi_Minh)
          const isWalkIn = source === BookingSource.WALK_IN;
          let startAt: Date;
          if (isWalkIn) {
            startAt = new Date();
          } else {
            if (!dto.startAt) {
              throw new BadRequestException('Vui lòng chọn thời gian bắt đầu hẹn');
            }
            startAt = new Date(dto.startAt);
          }
          startAt.setSeconds(0, 0);
          if (!isWalkIn && startAt <= new Date()) {
            throw new BadRequestException('Giờ hẹn đã qua. Vui lòng chọn giờ khác.');
          }

          const vnDateStr = formatVnDate(startAt);
          const lockKey = `appt:${vnDateStr}`;

          // 3. Khóa tuần tự hóa theo ngày (PostgreSQL Advisory Lock)
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

          // 4. Đọc cấu hình từ DB
          const settings = await tx.shopSettings.findUnique({ where: { id: 'singleton' } });
          if (!settings) {
            throw new InternalServerErrorException('Chưa có cấu hình giờ hoạt động của Spa. Vui lòng liên hệ bộ phận hỗ trợ.');
          }

          // Kiểm tra ngày nghỉ lễ
          if (settings.holidays.includes(vnDateStr)) {
            throw new BadRequestException(`PetCare nghỉ lễ vào ngày ${vnDateStr}, vui lòng chọn ngày khác`);
          }

          // 5. Cân nặng chỉ xác định giá; thời lượng không tham gia xếp lịch hoặc tính công suất.
          if (pet.weightKg > 20) {
            throw new BadRequestException('Rất tiếc, dịch vụ này hiện chỉ nhận thú cưng đến tối đa 20 kg.');
          }

          const activeSizeTiers = await tx.sizeTier.findMany({ where: { active: true } });
          const sizeTier = findSizeTierAtWeight(activeSizeTiers, pet.weightKg);
          if (!sizeTier) {
            throw new BadRequestException(`Cân nặng ${pet.weightKg}kg chưa có nhóm size phù hợp`);
          }

          const uniqueServiceIds = Array.from(new Set(dto.serviceIds));
          const services = await tx.service.findMany({
            where: { id: { in: uniqueServiceIds }, isActive: true, category: { in: Object.values(ServiceCategory) } },
            include: { priceTiers: true },
          });
          if (services.length !== uniqueServiceIds.length) {
            throw new BadRequestException('Dịch vụ không hợp lệ hoặc đã ngừng kinh doanh.');
          }

          const priceByServiceId = new Map<string, number>();
          for (const service of services) {
            const priceTier = findWeightPriceTier(service.priceTiers, pet.species, pet.weightKg);
            if (!priceTier) {
              throw new BadRequestException('Dịch vụ không có bậc giá phù hợp với cân nặng của thú cưng.');
            }
            priceByServiceId.set(service.id, priceTier.price);
          }

          const bookingServicePrices = services.map((service) => ({
            serviceId: service.id,
            sizeTierId: sizeTier.id,
            priceFrom: priceByServiceId.get(service.id)!,
          }));

          const subtotal = bookingServicePrices.reduce((acc, sp) => acc + sp.priceFrom, 0);
          if (confirmation && bookingQuoteFingerprint(pet, services, priceByServiceId) !== confirmation.expectedState) {
            throw new ConflictException('Giá hoặc thông tin thú cưng/dịch vụ đã thay đổi. Bạn vui lòng xem lại và xác nhận mức mới.');
          }
          const extraPrice = isStaff && dto.extraPrice ? Math.max(0, dto.extraPrice) : 0;
          const discount = Math.max(0, dto.discount ?? 0);
          const total = Math.max(0, subtotal + extraPrice - discount);

          // 6. Kiểm tra giờ mở cửa (openHours)
          const vnDayNum = (
            new Date(startAt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay() || 7
          ).toString();
          const dayHours = (settings.openHours as any)?.[vnDayNum];
          if (!dayHours) {
            throw new BadRequestException('Spa không hoạt động vào ngày đã chọn.');
          }
          if (isShiftHandoverStartTime(startAt)) {
            throw new BadRequestException(SHIFT_HANDOVER_START_ERROR);
          }
          const openTime = parseVnTime(vnDateStr, dayHours.open);
          const closeTime = parseVnTime(vnDateStr, dayHours.close);
          if (startAt < openTime || startAt >= closeTime) {
            throw new BadRequestException(
              `Giờ tiếp nhận ${formatVnTime(startAt)} nằm ngoài giờ mở cửa (${dayHours.open} - ${dayHours.close})`,
            );
          }

          // 7. Hẹn trước dùng khung giờ cấu hình; walk-in giữ giờ nhận thật.
          const now = new Date();
          if (!isWalkIn) {
            const minute = Number(formatVnTime(startAt).split(':')[1]);
            if (minute % settings.slotStepMin !== 0) {
              throw new BadRequestException(
                `Giờ hẹn phải bắt đầu theo bước nhảy ${settings.slotStepMin} phút`,
              );
            }
          }
          if (source === BookingSource.WEB) {
            const minNoticeTime = new Date(now.getTime() + settings.minNoticeHours * 3600000);
            const maxAdvanceTime = new Date(now.getTime() + settings.maxAdvanceDays * 86400000);
            if (startAt < minNoticeTime) {
              throw new BadRequestException(
                `Vui lòng đặt trước ít nhất ${settings.minNoticeHours} tiếng`,
              );
            }
            if (startAt > maxAdvanceTime) {
              throw new BadRequestException(
                `Chỉ nhận đặt lịch trong vòng ${settings.maxAdvanceDays} ngày tới`,
              );
            }

            // Giới hạn chống giữ chỗ ảo: Tối đa 3 lịch BOOKED mở cùng lúc
            const openBookingsCount = await tx.booking.count({
              where: { customerId, statusV2: BookingStatusV2.BOOKED, startAt: { gte: now } },
            });
            if (openBookingsCount >= 3) {
              throw new BadRequestException(
                'Bạn đang có 3 lịch hẹn chưa diễn ra. Vui lòng hoàn tất hoặc hủy lịch cũ trước khi đặt tiếp',
              );
            }
          }

          // 8. Capacity áp theo khung bắt đầu; walk-in giữa khung tính vào khung kế tiếp.
          let capacityWasOverridden = false;
          const capacitySlotStartAt = isWalkIn
            ? roundUpToNextStartSlot(startAt, settings.slotStepMin)
            : startAt;
          {
            if (capacitySlotStartAt >= closeTime) {
              throw new BadRequestException(
                `Rất tiếc, giờ nhận khách tiếp theo là ${formatVnTime(capacitySlotStartAt)} và đã ngoài giờ Spa. Vui lòng quay lại trong giờ hoạt động.`,
              );
            }
            const startOfDay = parseVnTime(vnDateStr, '00:00');
            const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60000);
            const dayBookings = await tx.booking.findMany({
              where: {
                type: BookingType.SPA,
                startAt: { gte: startOfDay, lt: startOfNextDay },
                ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
              },
              select: { source: true, statusV2: true, startAt: true },
            });
            const capacityCheck = checkStartSlotCapacity(
              capacitySlotStartAt,
              settings.slotStepMin,
              source,
              settings.capacity,
              null,
              dayBookings.filter((booking) =>
                booking.startAt !== null &&
                booking.statusV2 !== BookingStatusV2.CANCELLED &&
                booking.statusV2 !== BookingStatusV2.NO_SHOW,
              ).map((booking) => ({ startAt: booking.startAt!, source: booking.source })),
            );

            if (!capacityCheck.ok) {
              const timeLabel = formatVnTime(capacityCheck.conflictTime!);
              if (isWalkIn && capacityOverrideReason) {
                capacityWasOverridden = true;
              } else {
                throw new ConflictException(
                  `Khung giờ lúc ${timeLabel} đã kín chỗ (${capacityCheck.concurrentTotal}/${capacityCheck.maxCapacity}).`,
                );
              }
            }
          }

          // 9. Insert Booking và snapshot dịch vụ
          const initialStatus: BookingStatusV2 = isWalkIn
            ? BookingStatusV2.ARRIVED
            : BookingStatusV2.BOOKED;

          const booking = await tx.booking.create({
            data: {
              idempotencyKey,
              idempotencyHash,
              aiConfirmationId: confirmation?.id,
              code: generateBookingCode(),
              type: BookingType.SPA,
              customerId,
              petId: dto.petId,
              startAt,
              endAt: null,
              extraMin: 0,
              extraPrice,
              status: isWalkIn ? BookingStatus.IN_PROGRESS : BookingStatus.CONFIRMED,
              statusV2: initialStatus,
              source,
              spaBookingPromotionEligible:
                source === BookingSource.WEB && settings.spaBookingPromotionActive,
              subtotal,
              discount,
              total,
              staffNote: dto.staffNote,
              createdByStaffId: isStaff ? userContext.userId : null,
              services: {
                create: bookingServicePrices.map((sp) => ({
                  serviceId: sp.serviceId,
                  sizeTierId: sp.sizeTierId,
                  durationMin: null,
                  priceApplied: sp.priceFrom,
                })),
              },
              statusLogs: {
                create: {
                  toStatus: initialStatus,
                  action: capacityWasOverridden ? 'FORCE_OVERBOOK' : (isWalkIn ? 'WALK_IN_CREATE' : 'CREATE'),
                  staffId: isStaff ? userContext.userId : null,
                  reason: capacityWasOverridden
                    ? capacityOverrideReason
                    : (isWalkIn ? 'Khách vãng lai làm ngay' : 'Đặt qua Web'),
                  meta: {
                    extraPrice,
                    forcedOverbook: capacityWasOverridden,
                    capacitySlotStartAt: isWalkIn ? capacitySlotStartAt.toISOString() : null,
                  },
                },
              },
            },
            include: {
              services: { include: { service: true, sizeTier: true } },
              pet: true,
              customer: true,
              statusLogs: true,
            },
          });

          await tx.notification.create({
            data: {
              userId: booking.customerId,
              title: 'Đặt lịch thành công',
              body: `Mã đặt lịch của bạn: ${booking.code}. Vui lòng đến đúng giờ hẹn.`,
              type: 'BOOKING',
              refId: booking.id,
            },
          });

          return booking;
        },
        {
          maxWait: 5000,
          timeout: 10000,
        },
      );
      if (!replayed && booking.customer?.email) {
        const appointmentAt = booking.startAt
          ? `${formatVnDate(booking.startAt)} lúc ${formatVnTime(booking.startAt)}`
          : 'theo giờ hẹn đã chọn';
        await this.mailService?.sendBusinessNotificationEmail(
          booking.customer.email,
          'Xác nhận đặt lịch Spa PetCare',
          `Lịch hẹn ${booking.code} cho bé ${booking.pet.name} đã được tạo vào ${appointmentAt}.`,
        );
      }
      return booking;
    } catch (error: any) {
      if (error?.code === 'P2028') {
        throw new ServiceUnavailableException(
          'Hệ thống đang xử lý nhiều lượt đặt cùng lúc. Vui lòng thử lại sau giây lát.',
        );
      }
      throw error;
    }
  }

  /**
   * Đổi giờ hẹn V2: Sắp xếp 2 lock key theo thứ tự từ điển trước khi lock để triệt tiêu deadlock.
   */
  async rescheduleAppointmentTx(
    bookingId: string,
    userContext: { userId: string; role: Role },
    dto: RescheduleBookingDto,
  ) {
    const isStaff = userContext.role === Role.STAFF || userContext.role === Role.ADMIN;
    const force = isStaff ? (dto.force ?? false) : false;

    try {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          const booking = await tx.booking.findUnique({ where: { id: bookingId } });
          if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');

          if (!isStaff && booking.customerId !== userContext.userId) {
            throw new ForbiddenException('Bạn không có quyền đổi giờ lịch hẹn này.');
          }

          if (booking.statusV2 && booking.statusV2 !== BookingStatusV2.BOOKED) {
            throw new BadRequestException('Chỉ có thể đổi giờ khi lịch vẫn ở trạng thái Đã đặt.');
          }

          const settings = await tx.shopSettings.findUnique({ where: { id: 'singleton' } });
          if (!settings) throw new InternalServerErrorException('Chưa có cấu hình giờ hoạt động của Spa. Vui lòng liên hệ bộ phận hỗ trợ.');

          if (!isStaff) {
            this.assertCustomerBookingSelfServiceWindow(
              booking.startAt,
              settings.cancelBeforeHours,
              'đổi giờ',
            );
          }

          const newStartAt = new Date(dto.newStartAt);
          newStartAt.setSeconds(0, 0);
          if (!Number.isFinite(newStartAt.getTime())) {
            throw new BadRequestException('Ngày giờ đổi lịch không hợp lệ.');
          }
          if (newStartAt.getTime() <= Date.now()) {
            throw new BadRequestException('Không thể đổi lịch sang giờ đã qua. Vui lòng chọn một khung giờ trong tương lai.');
          }
          const newStartMinute = Number(formatVnTime(newStartAt).split(':')[1]);
          if (newStartMinute % settings.slotStepMin !== 0) {
            throw new BadRequestException(`Giờ hẹn phải bắt đầu theo bước nhảy ${settings.slotStepMin} phút`);
          }
          if (isShiftHandoverStartTime(newStartAt)) {
            throw new BadRequestException(SHIFT_HANDOVER_START_ERROR);
          }

          const oldVnDate = formatVnDate(booking.startAt ?? newStartAt);
          const newVnDate = formatVnDate(newStartAt);

          // Khóa thứ tự từ điển 2 ngày tránh deadlock
          const [firstDate, secondDate] = [oldVnDate, newVnDate].sort();
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('appt:' || ${firstDate}))`;
          if (firstDate !== secondDate) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('appt:' || ${secondDate}))`;
          }

          // Kiểm tra ngày nghỉ và giờ bắt đầu trong giờ mở cửa.
          if (settings.holidays.includes(newVnDate) && !force) {
            throw new BadRequestException(`PetCare nghỉ lễ vào ngày ${newVnDate}, vui lòng chọn ngày khác`);
          }

          const vnDayNum = (
            new Date(newStartAt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay() || 7
          ).toString();
          const dayHours = (settings.openHours as any)?.[vnDayNum];
          if (!dayHours && !force) {
            throw new BadRequestException('Spa không hoạt động vào ngày đã chọn.');
          }
          if (dayHours && !force) {
            const openTime = parseVnTime(newVnDate, dayHours.open);
            const closeTime = parseVnTime(newVnDate, dayHours.close);
            if (newStartAt < openTime || newStartAt >= closeTime) {
              throw new BadRequestException(
                `Giờ hẹn ${formatVnTime(newStartAt)} nằm ngoài giờ mở cửa (${dayHours.open} - ${dayHours.close})`,
              );
            }
          }

          // Kiểm tra giới hạn riêng của khung 30 phút, không phụ thuộc thời lượng dịch vụ.
          if (!force) {
            const startOfDay = parseVnTime(newVnDate, '00:00');
            const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60000);
            const dayBookings = await tx.booking.findMany({
              where: {
                type: BookingType.SPA,
                startAt: { gte: startOfDay, lt: startOfNextDay },
                id: { not: bookingId },
              },
              select: { source: true, statusV2: true, startAt: true },
            });
            const capacityCheck = checkStartSlotCapacity(
              newStartAt,
              settings.slotStepMin,
              booking.source,
              settings.capacity,
              null,
              dayBookings.filter((item) =>
                item.startAt !== null &&
                item.statusV2 !== BookingStatusV2.CANCELLED &&
                item.statusV2 !== BookingStatusV2.NO_SHOW,
              ).map((item) => ({ startAt: item.startAt!, source: item.source })),
            );

            if (!capacityCheck.ok) {
              throw new ConflictException(`Khung giờ lúc ${formatVnTime(newStartAt)} đã kín chỗ.`);
            }
          }

          const updated = await tx.booking.update({
            where: { id: bookingId },
            data: {
              startAt: newStartAt,
              reminderSentAt: null,
              endAt: null,
              extraMin: 0,
              statusLogs: {
                create: {
                  fromStatus: booking.statusV2,
                  toStatus: booking.statusV2 ?? BookingStatusV2.BOOKED,
                  action: 'RESCHEDULE',
                  staffId: isStaff ? userContext.userId : null,
                  reason: dto.reason ?? 'Khách yêu cầu đổi giờ hẹn',
                  meta: {
                    oldStart: booking.startAt,
                    newStart: newStartAt,
                    forced: force,
                  },
                },
              },
            },
          });

          return updated;
        },
        {
          maxWait: 5000,
          timeout: 10000,
        },
      );
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, pet: true },
      });
      if (booking?.customer?.email && updated.startAt) {
        await this.mailService?.sendBusinessNotificationEmail(
          booking.customer.email,
          'Lịch hẹn Spa PetCare đã đổi giờ',
          `Lịch hẹn ${booking.code} cho bé ${booking.pet.name} đã được đổi sang ${formatVnDate(updated.startAt)} lúc ${formatVnTime(updated.startAt)}.`,
        );
      }
      return updated;
    } catch (error: any) {
      if (error?.code === 'P2028') {
        throw new ServiceUnavailableException('Hệ thống đang bận. Vui lòng thử lại sau giây lát.');
      }
      throw error;
    }
  }

  /**
   * Máy trạng thái vận hành với Conditional Update chống bấm đúp và ghi nhận side-effect trong transaction.
   */
  async changeStatusV2(
    bookingId: string,
    userContext: { userId: string; role: Role },
    dto: ChangeStatusDto,
  ) {
    const fromStatus = dto.fromStatus as BookingStatusV2;
    const toStatus = dto.toStatus as BookingStatusV2;
    const isStaff = userContext.role === Role.STAFF || userContext.role === Role.ADMIN;

    // Kiểm tra ma trận chuyển trạng thái
    const allowedTransitions: Record<BookingStatusV2, BookingStatusV2[]> = {
      [BookingStatusV2.BOOKED]: [BookingStatusV2.ARRIVED, BookingStatusV2.CANCELLED, BookingStatusV2.NO_SHOW],
      [BookingStatusV2.ARRIVED]: [BookingStatusV2.IN_SERVICE, BookingStatusV2.CANCELLED],
      [BookingStatusV2.IN_SERVICE]: [BookingStatusV2.READY_FOR_PICKUP, BookingStatusV2.CANCELLED],
      [BookingStatusV2.READY_FOR_PICKUP]: [BookingStatusV2.DONE, BookingStatusV2.CANCELLED],
      [BookingStatusV2.DONE]: [],
      [BookingStatusV2.CANCELLED]: [],
      [BookingStatusV2.NO_SHOW]: [],
    };

    if (!allowedTransitions[fromStatus]?.includes(toStatus)) {
      throw new BadRequestException('Không thể thực hiện bước tiếp theo từ trạng thái hiện tại. Hãy tải lại lịch để kiểm tra.');
    }

    // Khách chỉ được hủy BOOKED -> CANCELLED
    if (!isStaff) {
      if (fromStatus !== BookingStatusV2.BOOKED || toStatus !== BookingStatusV2.CANCELLED) {
        throw new ForbiddenException('Khách hàng chỉ được phép hủy lịch hẹn.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn.');
      if (!isStaff && booking.customerId !== userContext.userId) {
        throw new ForbiddenException('Bạn không có quyền cập nhật lịch hẹn này.');
      }
      if (booking.statusV2 !== fromStatus) {
        throw new ConflictException('Trạng thái lịch hẹn đã thay đổi. Vui lòng tải lại trang.');
      }
      const now = new Date();
      if (!isStaff && fromStatus === BookingStatusV2.BOOKED && toStatus === BookingStatusV2.CANCELLED) {
        const settings = await tx.shopSettings.findUnique({ where: { id: 'singleton' } });
        if (!settings) {
          throw new InternalServerErrorException(
            'Chưa có cấu hình giờ hoạt động của Spa. Vui lòng liên hệ bộ phận hỗ trợ.',
          );
        }
        this.assertCustomerBookingSelfServiceWindow(
          booking.startAt,
          settings.cancelBeforeHours,
          'hủy',
        );
      }
      const vnDateStr = formatVnDate(booking.startAt ?? now);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('appt:' || ${vnDateStr}))`;
      if (fromStatus === BookingStatusV2.ARRIVED && toStatus === BookingStatusV2.IN_SERVICE) {
        const pet = await tx.petProfile.findUnique({ where: { id: booking.petId }, select: { weightKg: true } });
        if (!pet || !Number.isFinite(pet.weightKg) || pet.weightKg <= 0) {
          throw new BadRequestException('Hồ sơ bé chưa có cân nặng hợp lệ. Hãy cập nhật cân nặng.');
        }
        if (pet.weightKg > 20) {
          throw new BadRequestException('Rất tiếc, dịch vụ này hiện chỉ nhận thú cưng đến tối đa 20 kg.');
        }
        const latestReweigh = await tx.bookingStatusLog.findFirst({
          where: {
            bookingId,
            action: {
              in: [
                'WEIGHT_RECHECK_PENDING',
                'WEIGHT_RECHECK_UNSUPPORTED',
                'ACTUAL_WEIGHT_UPDATED',
                'WEIGHT_RECHECK_ACCEPTED',
                'WEIGHT_RECHECK_ACCEPTED_FORCE_OVERBOOK',
                'WEIGHT_RECHECK_DECLINED',
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        // Giá đã lưu dùng được ngay nếu nhân viên không điều chỉnh cân nặng.
        // Chỉ chặn lần điều chỉnh chưa có giá hợp lệ hoặc chưa được áp dụng.
        if (
          latestReweigh &&
          ['WEIGHT_RECHECK_PENDING', 'WEIGHT_RECHECK_UNSUPPORTED', 'WEIGHT_RECHECK_DECLINED'].includes(latestReweigh.action)
        ) {
          throw new BadRequestException(
            'Cân nặng vừa nhập chưa có giá hợp lệ. Hãy sửa cân nặng trước khi bắt đầu.',
          );
        }
      }
      if (toStatus === BookingStatusV2.NO_SHOW) {
        if (!isStaff) {
          throw new ForbiddenException('Chỉ quản trị viên hoặc nhân viên được xác nhận khách không đến.');
        }
        if (!dto.reason?.trim()) {
          throw new BadRequestException('Vui lòng ghi lý do chuyển lịch sang Không đến.');
        }
        if (!booking.startAt) {
          throw new BadRequestException('Lịch hẹn chưa có giờ bắt đầu nên chưa thể đánh dấu Không đến.');
        }
        const earliestNoShowAt = booking.startAt.getTime() + 20 * 60 * 1000;
        if (Date.now() < earliestNoShowAt) {
          throw new BadRequestException('Chỉ có thể đánh dấu Không đến sau giờ hẹn ít nhất 20 phút.');
        }
      }
      if (
        fromStatus === BookingStatusV2.READY_FOR_PICKUP &&
        toStatus === BookingStatusV2.DONE &&
        ((!booking.isPaid && booking.total > 0) ||
          (booking.latePickupFeeAmount > 0 && !booking.latePickupFeePaidAt))
      ) {
        throw new BadRequestException('Chỉ có thể hoàn tất lịch sau khi đã thu đủ tiền dịch vụ và phí chăm giữ (nếu có).');
      }

      // Chuyển có điều kiện (Conditional Update) chống bấm đúp
      const updateResult = await tx.booking.updateMany({
        where: { id: bookingId, statusV2: fromStatus },
        data: {
          statusV2: toStatus,
          updatedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Trạng thái lịch hẹn đã bị thay đổi bởi thao tác khác. Vui lòng tải lại trang.');
      }

      // Side-effects
      if (fromStatus === BookingStatusV2.READY_FOR_PICKUP && toStatus === BookingStatusV2.DONE) {
        // Điểm tích lũy chỉ cộng 1 lần: nếu quầy đã thu tiền (isPaid) thì TransactionsService đã cộng.
        const pointsToAward = booking.isPaid ? booking.pointsAwarded : Math.floor(booking.total / 10000);
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            isPaid: true,
            pointsAwarded: pointsToAward,
          },
        });

        if (!booking.isPaid && pointsToAward > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: booking.customerId,
              amount: pointsToAward,
              type: 'EARN',
              description: `Tích điểm hoàn tất lịch hẹn ${booking.code}`,
              refId: booking.id,
            },
          });
          await tx.user.update({
            where: { id: booking.customerId },
            data: { loyaltyPoints: { increment: pointsToAward } },
          });
        }
      } else if (toStatus === BookingStatusV2.NO_SHOW) {
        await tx.user.update({
          where: { id: booking.customerId },
          data: { noShowCount: { increment: 1 } },
        });
      }

      // Ghi audit log
      await tx.bookingStatusLog.create({
        data: {
          bookingId,
          fromStatus,
          toStatus,
          action: 'STATUS_CHANGE',
          staffId: isStaff ? userContext.userId : null,
          reason: dto.reason?.trim() || (toStatus === BookingStatusV2.CANCELLED
            ? null
            : `Cập nhật lịch: ${getBookingStatusLabel(fromStatus)} → ${getBookingStatusLabel(toStatus)}.`),
          meta: { fromStatus, toStatus },
        },
      });

      return tx.booking.findUnique({
        where: { id: bookingId },
        include: { services: true, statusLogs: true },
      });
    });
    if (toStatus === BookingStatusV2.CANCELLED || toStatus === BookingStatusV2.READY_FOR_PICKUP) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, pet: true },
      });
      if (booking?.customer?.email && booking.pet) {
        const isCancelled = toStatus === BookingStatusV2.CANCELLED;
        await this.mailService?.sendBusinessNotificationEmail(
          booking.customer.email,
          isCancelled ? 'Lịch hẹn Spa PetCare đã hủy' : 'Thú cưng đã sẵn sàng nhận tại PetCare',
          isCancelled
            ? `Lịch hẹn ${booking.code} cho bé ${booking.pet.name} đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ PetCare.`
            : `Bé ${booking.pet.name} đã hoàn tất dịch vụ trong lịch ${booking.code} và sẵn sàng để bạn đến nhận.`,
        );
      }
    }
    return updated;
  }

  /**
   * Tra cứu danh sách khung giờ bắt đầu khả dụng trên Web mà không cần time_slots.
   */
  async getAvailableSlots(
    dto: QueryAvailableSlotsDto,
    source: BookingSource = BookingSource.WEB,
  ) {
    const dateOnly = typeof dto.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dto.date)
      ? new Date(`${dto.date}T00:00:00.000Z`)
      : null;
    if (!dateOnly || Number.isNaN(dateOnly.getTime()) || dateOnly.toISOString().slice(0, 10) !== dto.date) {
      throw new BadRequestException('Ngày không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD.');
    }
    const settings = await this.prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) throw new InternalServerErrorException('Chưa có cấu hình giờ hoạt động của Spa. Vui lòng liên hệ bộ phận hỗ trợ.');

    const vnDateStr = dto.date;
    const now = new Date();

    if (settings.holidays.includes(vnDateStr)) {
      return { date: vnDateStr, slots: [] };
    }

    const parsedDate = parseVnTime(vnDateStr, '12:00');
    const vnDayNum = (
      new Date(parsedDate.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay() || 7
    ).toString();
    const dayHours = (settings.openHours as any)?.[vnDayNum];
    if (!dayHours) return { date: vnDateStr, slots: [] };

    const serviceIds = Array.from(new Set(dto.serviceIds));
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds }, isActive: true, category: { in: Object.values(ServiceCategory) } },
      select: { id: true, category: true },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Dịch vụ không hợp lệ hoặc đã ngừng kinh doanh.');
    }
    let weightKg = dto.weightKg;
    if (dto.petId) {
      const pet = await this.prisma.petProfile.findUnique({
        where: { id: dto.petId },
        select: { weightKg: true, archivedAt: true },
      });
      if (!pet) throw new BadRequestException('Thú cưng không tồn tại.');
      if (pet.archivedAt) {
        throw new BadRequestException('Hồ sơ thú cưng đã lưu trữ, không thể dùng để đặt lịch mới.');
      }
      weightKg = pet.weightKg;
    }
    if (weightKg !== undefined && weightKg > 20) {
      return { date: vnDateStr, slots: [] };
    }

    if (weightKg !== undefined) {
      const sizeTiers = await this.prisma.sizeTier.findMany({ where: { active: true } });
      const sizeTier = findSizeTierAtWeight(sizeTiers, weightKg);
      if (!sizeTier) {
        throw new BadRequestException('Không tìm thấy đúng một bậc cân nặng cho thú cưng.');
      }
    }

    const startOfDay = parseVnTime(vnDateStr, '00:00');
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60000);
    const dayBookings = await this.prisma.booking.findMany({
      where: {
        type: BookingType.SPA,
        startAt: { gte: startOfDay, lt: startOfNextDay },
      },
      select: { source: true, statusV2: true, startAt: true },
    });

    const capacityBookings = dayBookings.filter((booking) =>
      booking.startAt !== null &&
      booking.statusV2 !== BookingStatusV2.CANCELLED &&
      booking.statusV2 !== BookingStatusV2.NO_SHOW,
    ).map((booking) => ({ startAt: booking.startAt!, source: booking.source }));

    const openTime = parseVnTime(vnDateStr, dayHours.open);
    const closeTime = parseVnTime(vnDateStr, dayHours.close);
    const stepMin = settings.slotStepMin;
    const minNoticeTime = new Date(now.getTime() + settings.minNoticeHours * 3600000);
    const maxAdvanceTime = new Date(now.getTime() + settings.maxAdvanceDays * 86400000);

    const slots: Array<{
      time: string;
      available: boolean;
      remaining: number;
      unavailableReason?: 'SHIFT_HANDOVER';
    }> = [];

    let candidate = roundUpToNextStartSlot(openTime, stepMin);
    while (candidate < closeTime) {
      const timeLabel = formatVnTime(candidate);

      if (isShiftHandoverStartTime(candidate)) {
        slots.push({
          time: timeLabel,
          available: false,
          remaining: 0,
          unavailableReason: 'SHIFT_HANDOVER',
        });
      } else if (
        candidate <= now ||
        (source === BookingSource.WEB && (candidate < minNoticeTime || candidate > maxAdvanceTime))
      ) {
        slots.push({ time: timeLabel, available: false, remaining: 0 });
      } else {
        const checkResult = checkStartSlotCapacity(
          candidate,
          stepMin,
          source,
          settings.capacity,
          source === BookingSource.WEB ? settings.webCapacity : null,
          capacityBookings,
        );

        const totalRemaining = Math.max(0, settings.capacity - checkResult.concurrentTotal);
        const sourceRemaining = source === BookingSource.WEB && settings.webCapacity != null
          ? Math.max(0, settings.webCapacity - checkResult.concurrentWeb)
          : totalRemaining;

        slots.push({
          time: timeLabel,
          available: checkResult.ok,
          remaining: sourceRemaining,
        });
      }

      candidate = new Date(candidate.getTime() + stepMin * 60000);
    }

    return { date: vnDateStr, slots };
  }
}
