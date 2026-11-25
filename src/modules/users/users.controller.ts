import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { AdminUpdateUserDto } from './dto/admin-update.dto.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AdjustPointsDto } from './dto/adjust-points.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto.js';

@ApiTags('Users (Hồ sơ người dùng & Khách hàng)')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản hiện tại',
    description: 'Trả về thông tin chi tiết của người dùng đang đăng nhập cùng danh sách thú cưng và số lượng booking/order.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công.' })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Cập nhật thông tin cá nhân',
    description: 'Chỉnh sửa họ tên, số điện thoại hoặc ảnh đại diện của tài khoản hiện tại.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 409, description: 'Số điện thoại đã bị trùng với tài khoản khác.' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/notifications')
  @ApiOperation({
    summary: 'Danh sách thông báo cá nhân',
    description: 'Lấy lịch sử thông báo (đặt lịch, đơn hàng, điểm tích lũy) có hỗ trợ phân trang và lọc theo trạng thái đã đọc.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thông báo thành công.' })
  async getNotifications(
    @CurrentUser() user: User,
    @Query() query: QueryNotificationDto,
  ) {
    return this.usersService.getNotifications(user.id, query);
  }

  @Patch('me/notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu thông báo đã đọc',
    description: 'Chuyển trạng thái thông báo thành đã đọc theo ID.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  async markNotificationAsRead(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.usersService.markNotificationAsRead(user.id, id);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Số lượng tài khoản theo vai trò (Admin)' })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get('recoverable')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Danh sách khách hàng còn trong thời hạn khôi phục',
    description: 'Chỉ trả về tài khoản khách đã xóa tạm thời trong vòng 30 ngày.',
  })
  async findRecoverableCustomers(@Query() query: QueryUserDto) {
    return this.usersService.findRecoverableCustomers(query);
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Danh sách người dùng / Tra cứu bằng SĐT (Staff & Admin)',
    description: 'Tìm kiếm khách hàng bằng số điện thoại để tích điểm hoặc chọn khách hàng khi thanh toán tại quầy thu ngân.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách khách hàng thành công.' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Chi tiết thông tin người dùng theo ID (Staff & Admin)',
    description: 'Xem toàn bộ hồ sơ khách hàng, danh sách thú cưng và lịch sử tương tác.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin người dùng thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Phân quyền người dùng (Admin)',
    description: 'Chỉ Admin được đổi vai trò tài khoản. Không thể tự đổi quyền bản thân.',
  })
  @ApiResponse({ status: 200, description: 'Phân quyền thành công.' })
  @ApiResponse({ status: 409, description: 'Không thể tự đổi quyền.' })
  @ApiResponse({ status: 403, description: 'Chỉ quản trị viên mới được phân quyền tài khoản.' })
  async updateRole(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(admin.id, targetId, dto.role, admin.role);
  }

  @Patch(':id/points')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Điều chỉnh điểm tích lũy người dùng (Admin)',
    description: 'Cộng hoặc trừ điểm tích lũy thủ công cho khách hàng kèm lý do giải trình.',
  })
  async adjustPoints(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.usersService.adjustPoints(admin.id, targetId, dto.points, dto.reason);
  }

  @Patch(':id/admin-update')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật hồ sơ khách hàng bởi Admin',
    description: 'Thay đổi Email/SĐT cho khách bị mất tài khoản hoặc sai lệch.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  async adminUpdateProfile(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateProfile(admin.id, targetId, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Khóa / Mở khóa tài khoản (Admin)',
    description: 'Vô hiệu hóa hoặc kích hoạt lại tài khoản người dùng.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  @ApiResponse({ status: 400, description: 'Không thể tự khóa tài khoản của chính mình.' })
  async updateStatus(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(admin.id, targetId, dto.isActive);
  }

  @Patch(':id/profile')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật thông tin khách hàng (Admin)',
    description: 'Admin sửa thông tin (Email, Phone, Name) của khách hàng. Lưu vết vào AuditLog.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  async updateCustomerProfile(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.usersService.updateCustomerProfile(admin.id, targetId, dto);
  }

  @Patch(':id/soft-delete')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Khóa / Xóa tạm tài khoản rác (Admin)',
    description: 'Khóa và xóa tạm thời tài khoản. Email/SĐT khách hàng được giữ 30 ngày để khôi phục; lịch sử giao dịch được giữ.',
  })
  @ApiResponse({ status: 200, description: 'Đã xóa tạm thời.' })
  async softDeleteUser(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
  ) {
    return this.usersService.softDeleteUser(admin.id, targetId);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Khôi phục tài khoản khách hàng đã xóa tạm thời',
    description: 'Khôi phục trong vòng 30 ngày kể từ khi xóa; sau thời hạn, thông tin liên hệ đã được gỡ.',
  })
  @ApiResponse({ status: 200, description: 'Khôi phục tài khoản thành công.' })
  @ApiResponse({ status: 409, description: 'Tài khoản đã hết thời hạn hoặc không thể khôi phục.' })
  async restoreDeletedCustomer(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
  ) {
    return this.usersService.restoreDeletedCustomer(admin.id, targetId);
  }

  @Get(':id/audit-logs')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Xem lịch sử thao tác của tài khoản (Admin)',
  })
  async getAuditLogs(
    @CurrentUser() admin: User,
    @Param('id') targetId: string,
  ) {
    return this.usersService.getAuditLogs(targetId);
  }
}
