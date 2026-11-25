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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductCategory, Role, Species } from '@prisma/client';
import type { User } from '@prisma/client';

import { Public } from '../../common/decorators/auth.decorator.js';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ProductsService } from './products.service.js';
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@ApiTags('Products (Sản phẩm)')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Danh sách sản phẩm' })
  async findAll(
    @Query('category') category?: ProductCategory,
    @Query('species') species?: Species,
    @Query('isBestSeller') isBestSeller?: string,
    @Query('isNew') isNew?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll({
      category,
      species,
      isBestSeller:
        isBestSeller === 'true'
          ? true
          : isBestSeller === 'false'
            ? false
            : undefined,
      isNew: isNew === 'true' ? true : isNew === 'false' ? false : undefined,
      search,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('admin/summary')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Tổng quan tồn kho cho nhân viên vận hành và Admin',
  })
  async getAdminSummary() {
    return this.productsService.getAdminSummary();
  }

  @Get('admin/list')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Danh sách sản phẩm quản trị, gồm cả mặt hàng đã ngừng bán',
  })
  async findAllForAdmin(
    @Query('category') category?: ProductCategory,
    @Query('species') species?: Species,
    @Query('isBestSeller') isBestSeller?: string,
    @Query('isNew') isNew?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllForAdmin({
      category,
      species,
      isBestSeller:
        isBestSeller === 'true'
          ? true
          : isBestSeller === 'false'
            ? false
            : undefined,
      isNew: isNew === 'true' ? true : isNew === 'false' ? false : undefined,
      search,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('admin/:id/stock-movements')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Lịch sử tồn kho sản phẩm (Admin & Staff)' })
  async findStockMovements(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findStockMovements(
      id,
      page ? +page : undefined,
      limit ? +limit : undefined,
    );
  }

  @Post('admin/:id/stock-adjustments')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Điều chỉnh tồn kho sản phẩm (Admin & Staff)' })
  async adjustStock(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AdjustProductStockDto,
  ) {
    return this.productsService.adjustStock(id, dto, user.id);
  }

  @Get('recommend')
  @Public()
  @ApiOperation({
    summary: 'Gợi ý sản phẩm theo AI metadata',
    description: '?species=DOG&weightKg=10&tags=sensitive_stomach',
  })
  async recommend(
    @Query('species') species?: Species,
    @Query('weightKg') weightKg?: string,
    @Query('tags') tags?: string,
  ) {
    return this.productsService.recommend(
      species,
      weightKg ? +weightKg : undefined,
      tags ? tags.split(',') : undefined,
    );
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Chi tiết sản phẩm' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo sản phẩm (Admin & Staff)' })
  async create(@CurrentUser() user: User, @Body() dto: CreateProductDto) {
    return this.productsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật sản phẩm (Admin & Staff)' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa sản phẩm chưa được sử dụng (Admin & Staff)',
    description:
      'Sản phẩm có đơn hàng hoặc lịch sử tồn chỉ được ngừng bán để giữ dữ liệu đối soát.',
  })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
