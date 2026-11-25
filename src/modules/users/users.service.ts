import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, BookingStatusV2, Prisma, Role } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AdminUpdateUserDto } from './dto/admin-update.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private userSafeSelect = {
    id: true,
    email: true,
    name: true,
    phone: true,
    avatarUrl: true,
    role: true,
    loyaltyPoints: true,
    isActive: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true,
  };

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.userSafeSelect,
        _count: {
          select: {
            pets: true,
            bookings: true,
            orders: true,
          },
        },
        pets: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            weightKg: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản.');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existing && existing.id !== userId) {
        throw new ConflictException(
          'Số điện thoại này đã được sử dụng bởi một tài khoản khác. Nếu đây là số của bạn đã đăng ký tại quầy, vui lòng liên hệ lễ tân để được hỗ trợ gộp hồ sơ.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
      },
      select: this.userSafeSelect,
    });

    return updated;
  }

  async getNotifications(userId: string, query: QueryNotificationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.isRead !== undefined && { isRead: query.isRead }),
    };

    const [total, unreadCount, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async getStats() {
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const countForRole = (role: Role) => counts.find((item) => item.role === role)?._count._all ?? 0;

    return {
      total: counts.reduce((total, item) => total + item._count._all, 0),
      customers: countForRole(Role.CUSTOMER),
      staff: countForRole(Role.STAFF),
      admins: countForRole(Role.ADMIN),
    };
  }

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (query.phone) {
      where.phone = { contains: query.phone };
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          ...this.userSafeSelect,
          _count: {
            select: {
              pets: true,
              bookings: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSafeSelect,
        pets: { where: { archivedAt: null } },
        _count: {
          select: {
            bookings: true,
            orders: true,
            loyaltyTransactions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    return user;
  }

  async updateRole(adminId: string, targetUserId: string, role: Role, actorRole: Role) {
    if (adminId === targetUserId) {
      throw new ConflictException('Không thể tự thay đổi quyền của chính mình.');
    }

    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ quản trị viên mới được phân quyền tài khoản.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { role },
        select: this.userSafeSelect,
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_USER_ROLE',
          performedById: adminId,
          targetUserId,
          details: { previousRole: user.role, newRole: role },
        },
      });

      return updated;
    });
  }

  async adjustPoints(adminId: string, targetUserId: string, points: number, reason: string) {
    const normalizedReason = reason.trim();
    if (points === 0) {
      throw new BadRequestException('Số điểm điều chỉnh phải khác 0.');
    }
    if (!normalizedReason) {
      throw new BadRequestException('Vui lòng nhập lý do điều chỉnh điểm.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${targetUserId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng.');
      }

      const newPoints = user.loyaltyPoints + points;
      if (newPoints < 0) {
        throw new BadRequestException(`Không thể trừ quá số điểm hiện có (${user.loyaltyPoints} điểm).`);
      }

      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { loyaltyPoints: newPoints },
        select: this.userSafeSelect,
      });

      await tx.loyaltyTransaction.create({
        data: {
          userId: targetUserId,
          amount: Math.abs(points),
          type: points >= 0 ? 'EARN' : 'REDEEM',
          description: `[Nội bộ điều chỉnh] ${normalizedReason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ADJUST_LOYALTY_POINTS',
          performedById: adminId,
          targetUserId,
          details: {
            points,
            reason: normalizedReason,
            previousBalance: user.loyaltyPoints,
            newBalance: newPoints,
          },
        },
      });

      return updated;
    });
  }

  async adminUpdateProfile(adminId: string, targetId: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Check email uniqueness if changing
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
    }

    // Check phone uniqueness if changing
    if (dto.phone && dto.phone !== user.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing) throw new ConflictException('Số điện thoại đã được sử dụng bởi tài khoản khác');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetId },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
        },
        select: this.userSafeSelect,
      });

      await tx.auditLog.create({
        data: {
          action: 'ADMIN_UPDATE_PROFILE',
          performedById: adminId,
          targetUserId: targetId,
          details: { 
            old: { name: user.name, email: user.email, phone: user.phone },
            new: { name: dto.name, email: dto.email, phone: dto.phone }
          },
        },
      });

      return { message: 'Cập nhật hồ sơ khách hàng thành công', user: updatedUser };
    });
  }

  async updateStatus(adminId: string, targetUserId: string, isActive: boolean) {
    if (adminId === targetUserId && !isActive) {
      throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    if (user.deletedAt && isActive) {
      throw new BadRequestException(
        'Tài khoản đã xóa tạm thời. Hãy dùng chức năng khôi phục trong thời hạn cho phép.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { isActive },
        select: this.userSafeSelect,
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_USER_STATUS',
          performedById: adminId,
          targetUserId,
          details: { previousIsActive: user.isActive, newIsActive: isActive },
        },
      });

      return updated;
    });
  }

  async updateCustomerProfile(adminId: string, targetId: string, dto: { name?: string; email?: string; phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail && existingEmail.id !== user.id) {
        throw new ConflictException('Email này đã được sử dụng bởi một tài khoản khác. Vui lòng kiểm tra lại hoặc xóa tài khoản rác trước.');
      }
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhone && existingPhone.id !== user.id) {
        throw new ConflictException('Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetId },
        data: dto,
        select: this.userSafeSelect,
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PROFILE',
          performedById: adminId,
          targetUserId: targetId,
          details: {
            oldData: { name: user.name, email: user.email, phone: user.phone },
            newData: dto,
          },
        },
      });

      return updated;
    });
  }

  async softDeleteUser(adminId: string, targetId: string) {
    if (adminId === targetId) {
      throw new BadRequestException('Không thể tự xóa tài khoản của chính mình.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    if (user.deletedAt) {
      throw new ConflictException('Tài khoản đã được xóa tạm thời.');
    }

    const now = new Date();
    const todayInVietnam = new Date(
      `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)}T00:00:00.000Z`,
    );
    const upcomingBookings = await this.prisma.booking.count({
      where: {
        customerId: targetId,
        OR: [
          {
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            timeSlot: { slotDate: { gte: todayInVietnam } },
          },
          {
            statusV2: BookingStatusV2.BOOKED,
            startAt: { gte: now },
          },
        ],
      }
    });

    if (upcomingBookings > 0) {
      throw new BadRequestException('Không thể xóa tài khoản đang có lịch hẹn sắp tới.');
    }

    const deletedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetId },
        data: {
          deletedAt,
          isActive: false,
          emailVerifyToken: null,
          refreshToken: null,
          // Customer contacts are retained for the 30-day recovery window.
          ...(user.role !== Role.CUSTOMER && {
            email: user.email ? `${user.email}_deleted_${Date.now()}` : null,
            phone: user.phone ? `${user.phone}_deleted_${Date.now()}` : null,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'SOFT_DELETE',
          performedById: adminId,
          targetUserId: targetId,
          details: {
            reason: 'Yêu cầu xóa mềm từ khu vực quản trị.',
            recoveryWindowDays: user.role === Role.CUSTOMER ? 30 : 0,
          },
        },
      });

      return { message: 'Đã xóa tạm thời tài khoản thành công.' };
    });
  }

  async findRecoverableCustomers(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const recoveryCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const contactConditions: Prisma.UserWhereInput[] = [
      { OR: [{ email: null }, { NOT: { email: { contains: '_deleted_' } } }] },
      { OR: [{ phone: null }, { NOT: { phone: { contains: '_deleted_' } } }] },
    ];

    if (query.search?.trim()) {
      const search = query.search.trim();
      contactConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = {
      role: Role.CUSTOMER,
      isActive: false,
      deletedAt: { gt: recoveryCutoff },
      AND: contactConditions,
    };

    const select = {
      id: true,
      name: true,
      email: true,
      phone: true,
      deletedAt: true,
      createdAt: true,
    } as const;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select,
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async restoreDeletedCustomer(adminId: string, targetId: string) {
    const recoveryCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: targetId,
          role: Role.CUSTOMER,
          isActive: false,
          deletedAt: { gt: recoveryCutoff },
          AND: [
            { OR: [{ email: null }, { NOT: { email: { contains: '_deleted_' } } }] },
            { OR: [{ phone: null }, { NOT: { phone: { contains: '_deleted_' } } }] },
          ],
        },
        data: {
          isActive: true,
          deletedAt: null,
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Tài khoản không còn trong thời hạn khôi phục hoặc không ở trạng thái có thể khôi phục.',
        );
      }

      const user = await tx.user.findUnique({
        where: { id: targetId },
        select: this.userSafeSelect,
      });

      await tx.auditLog.create({
        data: {
          action: 'RESTORE_ACCOUNT',
          performedById: adminId,
          targetUserId: targetId,
          details: { recoveryWindowDays: 30 },
        },
      });

      return { message: 'Đã khôi phục tài khoản khách hàng.', user };
    });
  }

  async getAuditLogs(targetId: string) {
    return this.prisma.auditLog.findMany({
      where: { targetUserId: targetId },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: { select: { name: true, email: true } }
      }
    });
  }
}
