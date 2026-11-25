import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactRequestStatus, Role } from '@prisma/client';
import { Public, Roles } from '../../common/decorators/auth.decorator.js';
import { ContactRequestsService } from './contact-requests.service.js';
import { CreateContactRequestDto } from './dto/create-contact-request.dto.js';
import { ContactRequestQueryDto } from './dto/contact-request-query.dto.js';
import { UpdateContactRequestStatusDto } from './dto/update-contact-request-status.dto.js';

@ApiTags('Contact requests')
@ApiBearerAuth()
@Controller('contact-requests')
export class ContactRequestsController {
  constructor(private readonly contactRequestsService: ContactRequestsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Gửi yêu cầu liên hệ cho PetCare' })
  create(@Body() dto: CreateContactRequestDto) {
    return this.contactRequestsService.create(dto);
  }

  @Get('admin/dashboard')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Tóm tắt yêu cầu liên hệ chưa xử lý trên dashboard' })
  getDashboardQueue() {
    return this.contactRequestsService.getDashboardQueue();
  }

  @Get('admin')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Danh sách yêu cầu liên hệ cho Admin/Staff' })
  findAdmin(@Query() query: ContactRequestQueryDto) {
    return this.contactRequestsService.findAdmin(query);
  }

  @Patch('admin/:id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Cập nhật trạng thái xử lý yêu cầu liên hệ' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactRequestStatusDto) {
    return this.contactRequestsService.updateStatus(id, dto.status);
  }
}
