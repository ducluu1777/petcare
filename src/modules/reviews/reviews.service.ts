import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReviewTargetType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, dto: {
    targetType: ReviewTargetType;
    targetId: string;
    rating: number;
    comment: string;
  }) {
    // Validate: chỉ review sau khi đã dùng dịch vụ/mua sản phẩm (COMPLETED hoặc PAID)
    if (dto.targetType === ReviewTargetType.SERVICE) {
      const completedBooking = await this.prisma.booking.findFirst({
        where: {
          customerId: authorId,
          OR: [
            { status: 'COMPLETED' },
            { isPaid: true },
          ],
          services: { some: { serviceId: dto.targetId } },
        },
      });
      if (!completedBooking) throw new BadRequestException('Bạn chỉ có thể đánh giá dịch vụ sau khi lịch hẹn đã hoàn thành hoặc thanh toán.');
    } else {
      const completedOrder = await this.prisma.order.findFirst({
        where: {
          customerId: authorId,
          status: 'COMPLETED',
          items: { some: { productId: dto.targetId } },
        },
      });
      if (!completedOrder) throw new BadRequestException('Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã hoàn thành.');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: { authorId, ...dto },
      });

      if (dto.targetType === ReviewTargetType.PRODUCT) {
        const agg = await tx.review.aggregate({
          where: { targetType: ReviewTargetType.PRODUCT, targetId: dto.targetId, isHidden: false },
          _avg: { rating: true },
          _count: { rating: true },
        });
        await tx.product.update({
          where: { id: dto.targetId },
          data: {
            rating: agg._avg.rating ?? 5,
            reviewCount: agg._count.rating,
          },
        });
      }

      return newReview;
    });

    return review;
  }

  async findAll(targetType?: ReviewTargetType, targetId?: string) {
    const where: { isHidden: false; targetType?: ReviewTargetType; targetId?: string } = { isHidden: false };
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    const reviews = await this.prisma.review.findMany({
      where,
      include: { author: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachTargetNames(reviews);
  }

  async findAllForAdmin() {
    const reviews = await this.prisma.review.findMany({
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        moderatedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachTargetNames(reviews);
  }

  async moderate(id: string, actorId: string, dto: { isHidden: boolean; reason: string }) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, authorId: true, targetType: true, targetId: true, rating: true, isHidden: true },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá.');
    if (review.isHidden === dto.isHidden) {
      throw new BadRequestException(dto.isHidden ? 'Đánh giá này đã được ẩn.' : 'Đánh giá này đang hiển thị.');
    }

    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Cần ghi lý do kiểm duyệt.');

    const updatedReview = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.review.updateMany({
        where: { id, isHidden: review.isHidden },
        data: {
          isHidden: dto.isHidden,
          moderationReason: reason,
          moderatedAt: new Date(),
          moderatedById: actorId,
        },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Trạng thái đánh giá vừa được cập nhật. Tải lại danh sách rồi thử lại.');
      }

      await tx.auditLog.create({
        data: {
          action: dto.isHidden ? 'REVIEW_HIDDEN' : 'REVIEW_RESTORED',
          performedById: actorId,
          targetUserId: review.authorId,
          details: {
            reviewId: review.id,
            targetType: review.targetType,
            targetId: review.targetId,
            rating: review.rating,
            isHidden: dto.isHidden,
            reason,
          },
        },
      });

      if (review.targetType === ReviewTargetType.PRODUCT) {
        const aggregate = await tx.review.aggregate({
          where: { targetType: ReviewTargetType.PRODUCT, targetId: review.targetId, isHidden: false },
          _avg: { rating: true },
          _count: { rating: true },
        });
        await tx.product.updateMany({
          where: { id: review.targetId },
          data: {
            rating: aggregate._avg.rating ?? 5,
            reviewCount: aggregate._count.rating,
          },
        });
      }

      return tx.review.findUniqueOrThrow({
        where: { id },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          moderatedBy: { select: { id: true, name: true } },
        },
      });
    });
    const [item] = await this.attachTargetNames([updatedReview]);
    return item;
  }

  private async attachTargetNames<T extends { targetType: ReviewTargetType; targetId: string }>(reviews: T[]) {
    const serviceIds = [...new Set(
      reviews.filter((review) => review.targetType === ReviewTargetType.SERVICE).map((review) => review.targetId),
    )];
    const productIds = [...new Set(
      reviews.filter((review) => review.targetType === ReviewTargetType.PRODUCT).map((review) => review.targetId),
    )];
    const [services, products] = await Promise.all([
      serviceIds.length
        ? this.prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      productIds.length
        ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    const serviceNames = new Map(services.map((service) => [service.id, service.name]));
    const productNames = new Map(products.map((product) => [product.id, product.name]));

    return reviews.map((review) => ({
      ...review,
      targetName: (review.targetType === ReviewTargetType.SERVICE ? serviceNames : productNames)
        .get(review.targetId) ?? null,
    }));
  }

  async findByAuthor(authorId: string) {
    return this.prisma.review.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
