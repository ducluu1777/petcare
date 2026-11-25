import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateDeliveryAreaDto, UpdateDeliveryAreaDto } from './dto/delivery-area.dto.js';

function cleanName(value: string) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

@Injectable()
export class DeliveryAreasService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.deliveryArea.findMany({
      where: { isActive: true },
      orderBy: [{ province: 'asc' }, { ward: 'asc' }],
    });
  }

  listAll() {
    return this.prisma.deliveryArea.findMany({ orderBy: [{ province: 'asc' }, { ward: 'asc' }] });
  }

  async create(dto: CreateDeliveryAreaDto) {
    const province = cleanName(dto.province);
    const ward = cleanName(dto.ward);
    if (!province || !ward) throw new BadRequestException('Cần nhập tỉnh/thành và phường/xã.');
    const provinceKey = province.toLocaleLowerCase('vi-VN');
    const wardKey = ward.toLocaleLowerCase('vi-VN');
    const existing = await this.prisma.deliveryArea.findUnique({ where: { provinceKey_wardKey: { provinceKey, wardKey } } });
    if (existing) throw new BadRequestException('Khu vực giao hàng này đã tồn tại.');
    return this.prisma.deliveryArea.create({
      data: { province, provinceKey, ward, wardKey, fee: dto.fee, isActive: dto.isActive },
    });
  }

  async update(id: string, dto: UpdateDeliveryAreaDto) {
    const area = await this.prisma.deliveryArea.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('Không tìm thấy khu vực giao hàng.');
    const province = dto.province === undefined ? area.province : cleanName(dto.province);
    const ward = dto.ward === undefined ? area.ward : cleanName(dto.ward);
    if (!province || !ward) throw new BadRequestException('Cần nhập tỉnh/thành và phường/xã.');
    const provinceKey = province.toLocaleLowerCase('vi-VN');
    const wardKey = ward.toLocaleLowerCase('vi-VN');
    const duplicate = await this.prisma.deliveryArea.findUnique({ where: { provinceKey_wardKey: { provinceKey, wardKey } } });
    if (duplicate && duplicate.id !== id) throw new BadRequestException('Khu vực giao hàng này đã tồn tại.');
    return this.prisma.deliveryArea.update({
      where: { id },
      data: { province, provinceKey, ward, wardKey, fee: dto.fee, isActive: dto.isActive },
    });
  }
}
