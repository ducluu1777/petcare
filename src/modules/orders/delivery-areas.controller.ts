import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../../common/decorators/auth.decorator.js';
import { DeliveryAreasService } from './delivery-areas.service.js';
import { CreateDeliveryAreaDto, UpdateDeliveryAreaDto } from './dto/delivery-area.dto.js';

@ApiTags('Delivery areas')
@Controller('delivery-areas')
export class DeliveryAreasController {
  constructor(private readonly areas: DeliveryAreasService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Các phường/xã PetCare đang nhận giao hàng' })
  listActive() {
    return this.areas.listActive();
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  listAll() {
    return this.areas.listAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDeliveryAreaDto) {
    return this.areas.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryAreaDto) {
    return this.areas.update(id, dto);
  }
}
