import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { PetsService } from './pets.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { SetBehavioralFlagDto } from './dto/set-behavioral-flag.dto.js';

@ApiTags('Pets (Hồ sơ thú cưng)')
@ApiBearerAuth()
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Tạo hồ sơ thú cưng mới',
    description: 'Khách hàng tạo hồ sơ hoặc nhân viên tạo tại quầy. Hệ thống tự tính ngày nhắc đi Spa tiếp theo dựa theo giống.',
  })
  @ApiResponse({ status: 201, description: 'Tạo hồ sơ thành công.' })
  async create(@CurrentUser() user: User, @Body() dto: CreatePetDto) {
    if (user.role === Role.CUSTOMER) {
      return this.petsService.create(user.id, dto);
    }
    if (!dto.userId) {
      throw new BadRequestException('Vui lòng chọn tài khoản khách hàng trước khi tạo hồ sơ thú cưng.');
    }
    return this.petsService.createForCustomer(dto.userId, dto);
  }

  @Get('me')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Danh sách thú cưng của tôi',
    description: 'Lấy tất cả hồ sơ thú cưng thuộc tài khoản hiện tại.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  async findMine(@CurrentUser() user: User) {
    return this.petsService.findAllByUser(user.id);
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Tất cả hồ sơ thú cưng (Staff & Admin)',
    description: 'Danh sách quản lý hồ sơ thú cưng, phục vụ tra cứu tiền sử bệnh, cảnh báo hành vi.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  async findAll() {
    return this.petsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết hồ sơ thú cưng',
    description: 'Customer chỉ xem được pet của mình. Staff/Admin xem được tất cả.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công.' })
  @ApiResponse({ status: 403, description: 'Không có quyền xem hồ sơ này.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async findById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.petsService.findById(id, user.id, user.role);
  }

  @Patch(':id')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật hồ sơ thú cưng',
    description: 'Chủ sở hữu hoặc nhân viên (cân kiểm tra tại quầy) có thể cập nhật thông tin.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePetDto,
  ) {
    return this.petsService.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @Roles(Role.CUSTOMER, Role.STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa vĩnh viễn hồ sơ thú cưng',
    description: 'Chủ sở hữu hoặc nhân viên nội bộ có thể xóa hồ sơ khi chưa có booking tham chiếu. Hồ sơ có lịch sử phải được lưu trữ để giữ lại lịch sử.',
  })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công.' })
  @ApiResponse({ status: 400, description: 'Hồ sơ đã có lịch sử booking.' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.petsService.remove(id, user.id, user.role);
  }

  @Patch(':id/archive')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Lưu trữ hồ sơ thú cưng',
    description: 'Ẩn hồ sơ khỏi lựa chọn booking mới nhưng vẫn giữ hồ sơ và lịch sử. Không thể lưu trữ khi còn booking đang hoạt động.',
  })
  @ApiResponse({ status: 200, description: 'Lưu trữ hồ sơ thành công.' })
  @ApiResponse({ status: 400, description: 'Thú cưng còn booking chưa hoàn tất hoặc chưa bàn giao.' })
  async archive(@Param('id') id: string) {
    return this.petsService.archive(id);
  }

  @Patch(':id/restore')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Khôi phục hồ sơ thú cưng',
    description: 'Đưa hồ sơ đã lưu trữ trở lại danh sách có thể chọn khi tạo booking mới.',
  })
  @ApiResponse({ status: 200, description: 'Khôi phục hồ sơ thành công.' })
  async restore(@Param('id') id: string) {
    return this.petsService.restore(id);
  }

  @Patch(':id/behavioral-flag')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Gắn cờ hành vi thú cưng (Staff & Admin)',
    description: 'Đánh dấu AGGRESSIVE (Hung dữ) hoặc TIMID (Nhát/Dễ sốc) để cảnh báo đỏ ở booking kế tiếp.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật cờ hành vi thành công.' })
  async setBehavioralFlag(
    @Param('id') id: string,
    @Body() dto: SetBehavioralFlagDto,
  ) {
    return this.petsService.setBehavioralFlag(id, dto.behavioralFlag);
  }
}
