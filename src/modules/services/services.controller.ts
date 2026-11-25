import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, ServiceCategory, Species } from '@prisma/client';

import { Roles } from '../../common/decorators/auth.decorator.js';
import { Public } from '../../common/decorators/auth.decorator.js';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { SetPriceTiersDto, UpdateServiceDto } from './dto/update-service.dto.js';

@ApiTags('Services (Dịch vụ Spa & Grooming)')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Danh sách dịch vụ', description: 'Filter theo category và isAddon.' })
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  @ApiQuery({ name: 'isAddon', type: Boolean, required: false })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query('category') category?: ServiceCategory,
    @Query('isAddon') isAddon?: string,
  ) {
    const isAddonBool = isAddon === 'true' ? true : isAddon === 'false' ? false : undefined;
    return this.servicesService.findAll(category, isAddonBool);
  }

  @Get('admin/list')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách dịch vụ quản trị, gồm cả dịch vụ đã ngừng bán' })
  async findAllForAdmin(
    @Query('category') category?: ServiceCategory,
    @Query('isAddon') isAddon?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isAddonBool = isAddon === 'true' ? true : isAddon === 'false' ? false : undefined;
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.servicesService.findAllForAdmin(category, isAddonBool, isActiveBool);
  }

  @Get('calculate-price')
  @Public()
  @ApiOperation({
    summary: 'Tính giá dịch vụ cho thú cưng',
    description: 'Match bảng giá theo cân nặng và loài thú cưng. Chấp nhận petId hoặc cặp weightKg & species.',
  })
  @ApiQuery({ name: 'serviceId', required: true })
  @ApiQuery({ name: 'petId', required: false })
  @ApiQuery({ name: 'weightKg', required: false, type: Number })
  @ApiQuery({ name: 'species', enum: Species, required: false })
  @ApiResponse({ status: 200, description: 'Trả về giá áp dụng và tier label.' })
  @ApiResponse({ status: 400, description: 'Không tìm thấy bảng giá phù hợp.' })
  async calculatePrice(
    @Query('serviceId') serviceId: string,
    @Query('petId') petId?: string,
    @Query('weightKg') weightKg?: number,
    @Query('species') species?: Species,
  ) {
    return this.servicesService.calculatePrice(serviceId, petId, weightKg, species);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Chi tiết dịch vụ theo slug', description: 'Trả về thông tin đầy đủ kèm bảng giá.' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dịch vụ.' })
  async findBySlug(@Param('slug') slug: string) {
    return this.servicesService.findBySlug(slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Tạo dịch vụ mới (Admin & Staff)',
    description: 'Tạo dịch vụ kèm toàn bộ bảng giá trong 1 request.',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Slug đã tồn tại.' })
  async create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin dịch vụ (Admin & Staff)' })
  @ApiResponse({ status: 200 })
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa dịch vụ chưa được sử dụng (Admin & Staff)', description: 'Dịch vụ có tham chiếu lịch sử chỉ được ngừng bán.' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Dịch vụ đã có tham chiếu lịch sử.' })
  async remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }

  @Put(':id/price-tiers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Thay toàn bộ bảng giá (Admin & Staff)', description: 'Xóa hết tier cũ và tạo mới.' })
  @ApiResponse({ status: 200 })
  async setPriceTiers(@Param('id') id: string, @Body() dto: SetPriceTiersDto) {
    return this.servicesService.setPriceTiers(id, dto);
  }
}
