import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Public } from '../../common/decorators/auth.decorator.js';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { TimeSlotsService } from './time-slots.service.js';
import { BulkCreateTimeSlotsDto, UpdateTimeSlotDto } from './dto/time-slot.dto.js';

@ApiTags('Time Slots (Khung giờ Spa)')
@ApiBearerAuth()
@Controller('time-slots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get('available')
  @Public()
  @ApiOperation({ summary: 'Danh sách slot còn trống theo ngày' })
  @ApiQuery({ name: 'date', example: '2026-10-01' })
  async findAvailable(@Query('date') date: string) {
    return this.timeSlotsService.findAvailableByDate(date);
  }

  @Get('admin')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách toàn bộ khung giờ trong khoảng ngày (Admin & Staff)' })
  @ApiQuery({ name: 'from', example: '2026-10-01' })
  @ApiQuery({ name: 'to', example: '2026-10-31' })
  async findAdminRange(@Query('from') from: string, @Query('to') to: string) {
    return this.timeSlotsService.findAdminRange(from, to);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo hàng loạt time slots (Admin & Staff)' })
  async bulkCreate(@Body() dto: BulkCreateTimeSlotsDto) {
    return this.timeSlotsService.bulkCreate(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật capacity của slot (Admin & Staff)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTimeSlotDto) {
    return this.timeSlotsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa khung giờ chưa có lịch hẹn (Admin & Staff)' })
  async remove(@Param('id') id: string) {
    return this.timeSlotsService.remove(id);
  }
}
