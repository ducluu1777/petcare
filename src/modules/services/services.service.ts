import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceCategory, Species } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { SetPriceTiersDto, UpdateServiceDto } from './dto/update-service.dto.js';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  private formatPriceTierLabel(
    tier: { minWeight: number; maxWeight: number; species?: Species | null; id?: string },
    priceTiers: Array<{ minWeight: number; maxWeight: number; species?: Species | null; id?: string }>,
  ) {
    const sameSpeciesTiers = priceTiers
      .filter((candidate) => (candidate.species ?? null) === (tier.species ?? null))
      .sort((left, right) => left.minWeight - right.minWeight);
    const lastTier = sameSpeciesTiers.at(-1);
    const isLastTier = tier.id && lastTier?.id
      ? lastTier.id === tier.id
      : lastTier === tier;
    const formatWeight = (weight: number) => Number(weight.toFixed(1)).toString().replace('.', ',');

    if (tier.minWeight === 0 && !isLastTier) {
      return `Dưới ${formatWeight(tier.maxWeight)} kg`;
    }
    if (isLastTier) {
      return `Từ ${formatWeight(tier.minWeight)} đến tối đa ${formatWeight(tier.maxWeight)} kg`;
    }
    return `Từ ${formatWeight(tier.minWeight)} đến dưới ${formatWeight(tier.maxWeight)} kg`;
  }

  private generatePriceTierLabels<
    T extends { minWeight: number; maxWeight: number; species?: Species | null; id?: string },
  >(priceTiers: T[]) {
    return priceTiers.map((tier) => ({
      ...tier,
      label: this.formatPriceTierLabel(tier, priceTiers),
    }));
  }

  private withGeneratedPriceTierLabels<
    T extends { priceTiers: Array<{ minWeight: number; maxWeight: number; species?: Species | null; id?: string }> },
  >(service: T) {
    return {
      ...service,
      priceTiers: this.generatePriceTierLabels(service.priceTiers),
    };
  }

  async findAll(category?: ServiceCategory, isAddon?: boolean) {
    if (category && !Object.values(ServiceCategory).includes(category)) return [];
    const services = await this.prisma.service.findMany({
      where: {
        isActive: true,
        category: category ?? { in: Object.values(ServiceCategory) },
        ...(isAddon !== undefined && { isAddon }),
      },
      include: { priceTiers: true },
      orderBy: [{ isSignature: 'desc' }, { isPopular: 'desc' }, { createdAt: 'asc' }],
    });
    return services.map((service) => this.withGeneratedPriceTierLabels(service));
  }

  async findAllForAdmin(category?: ServiceCategory, isAddon?: boolean, isActive?: boolean) {
    if (category && !Object.values(ServiceCategory).includes(category)) return [];
    const services = await this.prisma.service.findMany({
      where: {
        ...(isActive !== undefined && { isActive }),
        category: category ?? { in: Object.values(ServiceCategory) },
        ...(isAddon !== undefined && { isAddon }),
      },
      include: {
        priceTiers: true,
        _count: { select: { bookingServices: true } },
      },
      orderBy: [{ isActive: 'desc' }, { isSignature: 'desc' }, { isPopular: 'desc' }, { createdAt: 'asc' }],
    });
    return services.map((service) => this.withGeneratedPriceTierLabels(service));
  }

  async findBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        isActive: true,
        category: { in: Object.values(ServiceCategory) },
        OR: [{ slug }, { id: slug }],
      },
      include: { priceTiers: true },
    });
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ.');
    return this.withGeneratedPriceTierLabels(service);
  }

  /**
   * Tính giá dịch vụ cho thú cưng cụ thể.
   * Các bậc là [minWeight, maxWeight), riêng bậc cuối nhận cả maxWeight.
   */
  async calculatePrice(
    serviceId: string,
    petId?: string,
    weightKg?: number,
    species?: Species,
  ) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, isActive: true, category: { in: Object.values(ServiceCategory) } },
      include: { priceTiers: true },
    });
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ.');

    let targetWeight: number;
    let targetSpecies: Species | null = null;
    let petName: string | undefined;

    if (petId) {
      const pet = await this.prisma.petProfile.findUnique({ where: { id: petId } });
      if (!pet) throw new NotFoundException('Không tìm thấy hồ sơ thú cưng.');
      targetWeight = pet.weightKg;
      targetSpecies = pet.species;
      petName = pet.name;
    } else if (weightKg !== undefined && weightKg !== null && !isNaN(Number(weightKg))) {
      targetWeight = Number(weightKg);
      if (!Number.isInteger(targetWeight * 10)) {
        throw new BadRequestException('Vui lòng nhập cân nặng tối đa một chữ số thập phân.');
      }
      targetSpecies = species ?? null;
    } else {
      throw new BadRequestException('Vui lòng cung cấp petId hoặc weightKg.');
    }

    if (!Number.isFinite(targetWeight) || targetWeight < 0) {
      throw new BadRequestException('Cân nặng phải là số hợp lệ và không âm.');
    }
    if (targetWeight > 20) {
      throw new BadRequestException('Rất tiếc, dịch vụ này hiện chỉ nhận thú cưng đến tối đa 20 kg.');
    }

    const exactSpeciesTiers = targetSpecies
      ? service.priceTiers.filter((t) => t.species === targetSpecies)
      : [];
    const applicableTiers = exactSpeciesTiers.length > 0
      ? exactSpeciesTiers
      : service.priceTiers.filter((t) => t.species === null);
    const sortedTiers = [...applicableTiers]
      .filter((tier) => tier.minWeight < 20)
      .sort((a, b) => a.minWeight - b.minWeight);
    const matchingTiers = sortedTiers.filter((tier, index) => {
      const tierMaxWeight = Math.min(tier.maxWeight, 20);
      return targetWeight >= tier.minWeight && (
        targetWeight < tierMaxWeight ||
        (index === sortedTiers.length - 1 && targetWeight === tierMaxWeight && tierMaxWeight === 20)
      );
    });

    if (matchingTiers.length !== 1) {
      throw new BadRequestException(
        matchingTiers.length > 1
          ? 'Bảng giá có các bậc cân nặng bị chồng lấn. Vui lòng liên hệ quản trị viên.'
          : 'Dịch vụ chưa có bậc giá phù hợp với cân nặng này.',
      );
    }
    const tier = matchingTiers[0];
    const tierWithAppliedMaxWeight = {
      ...tier,
      maxWeight: Math.min(tier.maxWeight, 20),
    };

    return {
      serviceId: service.id,
      serviceName: service.name,
      petId: petId ?? null,
      petName: petName ?? null,
      weightKg: targetWeight,
      tierLabel: this.formatPriceTierLabel(tierWithAppliedMaxWeight, sortedTiers),
      priceApplied: tier.price,
    };
  }

  async create(dto: CreateServiceDto) {
    const maxWeight = 20;
    this.validatePriceTiers(dto.priceTiers, maxWeight);
    const existing = await this.prisma.service.findUnique({ where: { slug: dto.slug }, select: { id: true } });
    if (existing) throw new ConflictException('Mã định danh dịch vụ đã được sử dụng. Hãy chọn mã khác.');

    const { priceTiers, ...serviceData } = dto;

    const createdService = await this.prisma.service.create({
      data: {
        ...serviceData,
        // The required legacy column is no longer part of spa booking operations.
        durationMin: 0,
        isPopular: serviceData.isPopular ?? false,
        isSignature: serviceData.isSignature ?? false,
        isAddon: serviceData.isAddon ?? false,
        requiresVaccination: serviceData.requiresVaccination ?? false,
        priceTiers: {
          create: this.generatePriceTierLabels(priceTiers),
        },
      },
      include: { priceTiers: true },
    });
    return this.withGeneratedPriceTierLabels(createdService);
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({
      where: { id, category: { in: Object.values(ServiceCategory) } },
      include: {
        priceTiers: {
          select: { minWeight: true, maxWeight: true, price: true, label: true, species: true },
        },
      },
    });
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ.');

    const { priceTiers, ...serviceData } = dto;
    const priceTiersWithGeneratedLabels = priceTiers === undefined
      ? undefined
      : this.generatePriceTierLabels(priceTiers);

    const categoryChanged = dto.category !== undefined && dto.category !== service.category;
    const addonChanged = dto.isAddon !== undefined && dto.isAddon !== service.isAddon;
    const maxWeight = 20;

    if (priceTiers !== undefined) {
      this.validatePriceTiers(priceTiers, maxWeight);
    } else if (
      (categoryChanged || addonChanged) &&
      service.priceTiers.some((tier) => tier.maxWeight > 20)
    ) {
      throw new BadRequestException('Hãy chỉnh bảng giá về tối đa 20 kg trước khi đổi danh mục hoặc loại dịch vụ.');
    } else if (categoryChanged || addonChanged) {
      this.validatePriceTiers(service.priceTiers, 20);
    }

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(serviceData).length > 0) {
        await tx.service.update({ where: { id, category: { in: Object.values(ServiceCategory) } }, data: serviceData });
      }

      if (priceTiers !== undefined) {
        await tx.servicePriceTier.deleteMany({ where: { serviceId: id } });
        await tx.servicePriceTier.createMany({
          data: priceTiersWithGeneratedLabels!.map((tier) => ({
            minWeight: tier.minWeight,
            maxWeight: tier.maxWeight,
            price: tier.price,
            label: tier.label,
            species: tier.species ?? null,
            serviceId: id,
          })),
        });
      }

      const updatedService = await tx.service.findUnique({ where: { id, category: { in: Object.values(ServiceCategory) } }, include: { priceTiers: true } });
      return updatedService ? this.withGeneratedPriceTierLabels(updatedService) : updatedService;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id, category: { in: Object.values(ServiceCategory) } } });
      if (!service) throw new NotFoundException('Không tìm thấy dịch vụ.');

      const bookingReference = await tx.bookingService.findFirst({ where: { serviceId: id }, select: { id: true } });
      if (bookingReference) {
        throw new BadRequestException('Dịch vụ đã được sử dụng trong lịch hẹn. Hãy ngừng kinh doanh để giữ lại lịch sử.');
      }

      // Price rows are configuration owned by this service; remove them only after historical references are ruled out.
      await tx.servicePrice.deleteMany({ where: { serviceId: id } });
      await tx.service.delete({ where: { id } });
      return { message: 'Đã xóa dịch vụ chưa phát sinh booking.' };
    });
  }

  async setPriceTiers(id: string, dto: SetPriceTiersDto) {
    const service = await this.prisma.service.findUnique({
      where: { id, category: { in: Object.values(ServiceCategory) } },
      select: { id: true, category: true, isAddon: true },
    });
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ.');
    const maxWeight = 20;
    this.validatePriceTiers(dto.priceTiers, maxWeight);

    const priceTiersWithGeneratedLabels = this.generatePriceTierLabels(dto.priceTiers);

    // Thay toàn bộ bảng giá trong 1 transaction
    await this.prisma.$transaction([
      this.prisma.servicePriceTier.deleteMany({ where: { serviceId: id } }),
      this.prisma.servicePriceTier.createMany({
        data: priceTiersWithGeneratedLabels.map((tier) => ({
          minWeight: tier.minWeight,
          maxWeight: tier.maxWeight,
          price: tier.price,
          label: tier.label,
          species: tier.species ?? null,
          serviceId: id,
        })),
      }),
    ]);

    const updatedService = await this.prisma.service.findUnique({ where: { id, category: { in: Object.values(ServiceCategory) } }, include: { priceTiers: true } });
    return updatedService ? this.withGeneratedPriceTierLabels(updatedService) : updatedService;
  }

  private validatePriceTiers(
    priceTiers: Array<{ minWeight: number; maxWeight: number; species?: Species | null }>,
    maxWeight?: number,
  ) {
    const groups = new Map<string, typeof priceTiers>();
    for (const tier of priceTiers) {
      if (!Number.isFinite(tier.minWeight) || !Number.isFinite(tier.maxWeight) || tier.minWeight < 0 || tier.maxWeight <= tier.minWeight) {
        throw new BadRequestException('Mỗi bậc giá cần có cân nặng tối thiểu hợp lệ và cân nặng tối đa lớn hơn mức tối thiểu.');
      }
      if (Number(tier.minWeight.toFixed(1)) !== tier.minWeight || Number(tier.maxWeight.toFixed(1)) !== tier.maxWeight) {
        throw new BadRequestException('Mốc cân nặng của bậc giá cần theo bước 0,1 kg.');
      }
      if (maxWeight !== undefined && Number((tier.maxWeight - tier.minWeight).toFixed(1)) < 5) {
        throw new BadRequestException('Mỗi bậc giá cần rộng tối thiểu 5 kg.');
      }
      if (maxWeight !== undefined && tier.maxWeight > maxWeight) {
        throw new BadRequestException('Dịch vụ hiện chỉ nhận thú cưng đến tối đa 20 kg. Hãy căn chỉnh bậc giá trong giới hạn này.');
      }
      const key = tier.species ?? 'ALL';
      groups.set(key, [...(groups.get(key) ?? []), tier]);
    }

    for (const tiers of groups.values()) {
      const sorted = [...tiers].sort((a, b) => a.minWeight - b.minWeight);
      if (sorted[0].minWeight !== 0) {
        throw new BadRequestException('Bảng giá phải bắt đầu từ 0 kg.');
      }
      for (let index = 1; index < sorted.length; index += 1) {
        if (sorted[index].minWeight !== sorted[index - 1].maxWeight) {
          throw new BadRequestException('Các bậc giá phải liền nhau, không chồng lấn hoặc để trống.');
        }
      }
      if (maxWeight !== undefined && sorted[sorted.length - 1].maxWeight !== maxWeight) {
        throw new BadRequestException('Bảng giá cần bao phủ đến đúng 20 kg và không được vượt quá giới hạn này.');
      }
    }
  }
}
