import {
  DiscountType,
  PrismaClient,
  ProductCategory,
  Role,
  ServiceCategory,
  Species,
} from '@prisma/client';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  deliveryAreaSeeds,
  productSeeds,
  serviceSeeds,
  shopOpenHours,
  sizeTierSeeds,
  voucherSeeds,
} from './seed-data.js';

type RowCounts = { new: number; existing: number };
type SeedReport = {
  rows: Record<string, RowCounts>;
  services: string[];
  products: string[];
  vouchers: string[];
  warnings: string[];
};

const prisma = new PrismaClient();
const report: SeedReport = {
  rows: {},
  services: [],
  products: [],
  vouchers: [],
  warnings: [],
};

async function saveTracked<T>(
  model: string,
  findExisting: () => Promise<unknown>,
  save: () => Promise<T>,
): Promise<T> {
  const existed = Boolean(await findExisting());
  const result = await save();
  const counts = (report.rows[model] ??= { new: 0, existing: 0 });
  counts[existed ? 'existing' : 'new'] += 1;
  return result;
}

function legacyTierLabel(index: number) {
  return ['Dưới 5 kg', 'Từ 5 đến dưới 10 kg', 'Từ 10 đến tối đa 20 kg'][index];
}

async function seedDemoData() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Seed demo bị chặn: hãy đặt NODE_ENV=development và xác nhận DATABASE_URL là database development.',
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await saveTracked(
        'ShopSettings',
        () =>
          tx.shopSettings.findUnique({
            where: { id: 'singleton' },
            select: { id: true },
          }),
        () =>
          tx.shopSettings.upsert({
            where: { id: 'singleton' },
            create: {
              id: 'singleton',
              capacity: 3,
              webCapacity: 3,
              bufferMin: 15,
              slotStepMin: 30,
              minNoticeHours: 2,
              maxAdvanceDays: 30,
              cancelBeforeHours: 4,
              noShowGraceMin: 20,
              noShowWarnCount: 3,
              spaBookingPromotionActive: true,
              latePickupFeeAmount: 50000,
              openHours: shopOpenHours,
              holidays: [],
            },
            update: {
              capacity: 3,
              webCapacity: 3,
              bufferMin: 15,
              slotStepMin: 30,
              minNoticeHours: 2,
              maxAdvanceDays: 30,
              cancelBeforeHours: 4,
              noShowGraceMin: 20,
              noShowWarnCount: 3,
              spaBookingPromotionActive: true,
              latePickupFeeAmount: 50000,
              openHours: shopOpenHours,
              holidays: [],
            },
          }),
      );

      await saveTracked(
        'AiAssistantSettings',
        () =>
          tx.aiAssistantSettings.findUnique({
            where: { id: 'singleton' },
            select: { id: true },
          }),
        () =>
          tx.aiAssistantSettings.upsert({
            where: { id: 'singleton' },
            create: { id: 'singleton', dailyRequestLimit: 1000 },
            update: { dailyRequestLimit: 1000 },
          }),
      );

      const sizeTiers = new Map<string, { id: string }>();
      for (const tier of sizeTierSeeds) {
        const byId = await tx.sizeTier.findUnique({
          where: { id: tier.id },
          select: { id: true },
        });
        const existing =
          byId ??
          (await tx.sizeTier.findFirst({
            where: { name: tier.name },
            select: { id: true },
          }));
        const saved = await saveTracked(
          'SizeTier',
          async () => existing,
          () =>
            existing
              ? tx.sizeTier.update({
                  where: { id: existing.id },
                  data: {
                    name: tier.name,
                    minKg: tier.minKg,
                    maxKg: tier.maxKg,
                    sortOrder: tier.sortOrder,
                    active: true,
                  },
                })
              : tx.sizeTier.create({ data: { ...tier, active: true } }),
        );
        sizeTiers.set(tier.name, saved);
      }

      for (const service of serviceSeeds) {
        const {
          prices: _prices,
          durations: _durations,
          legacySpecies,
          ...serviceData
        } = service;
        const savedService = await saveTracked(
          'Service',
          () =>
            tx.service.findUnique({
              where: { slug: service.slug },
              select: { id: true },
            }),
          () =>
            tx.service.upsert({
              where: { slug: service.slug },
              create: {
                ...serviceData,
                category: service.category as ServiceCategory,
                imageUrl: null,
              },
              update: {
                ...serviceData,
                category: service.category as ServiceCategory,
                imageUrl: null,
              },
            }),
        );
        report.services.push(service.name);

        for (let index = 0; index < sizeTierSeeds.length; index += 1) {
          const tier = sizeTierSeeds[index];
          const sizeTier = sizeTiers.get(tier.name);
          if (!sizeTier)
            throw new Error(
              `Thiếu SizeTier "${tier.name}" khi tạo giá dịch vụ.`,
            );

          await saveTracked(
            'ServicePrice',
            () =>
              tx.servicePrice.findUnique({
                where: {
                  serviceId_sizeTierId: {
                    serviceId: savedService.id,
                    sizeTierId: sizeTier.id,
                  },
                },
                select: { id: true },
              }),
            () =>
              tx.servicePrice.upsert({
                where: {
                  serviceId_sizeTierId: {
                    serviceId: savedService.id,
                    sizeTierId: sizeTier.id,
                  },
                },
                create: {
                  serviceId: savedService.id,
                  sizeTierId: sizeTier.id,
                  durationMin: service.durations[index],
                  priceFrom: service.prices[index],
                  active: true,
                },
                update: {
                  durationMin: service.durations[index],
                  priceFrom: service.prices[index],
                  active: true,
                },
              }),
          );
        }

        for (let index = 0; index < 3; index += 1) {
          const minWeight = sizeTierSeeds[index].minKg;
          const maxWeight = sizeTierSeeds[index].maxKg;
          const id = `${service.slug}-legacy-price-${index + 1}`;
          await saveTracked(
            'ServicePriceTier',
            () =>
              tx.servicePriceTier.findUnique({
                where: { id },
                select: { id: true },
              }),
            () =>
              tx.servicePriceTier.upsert({
                where: { id },
                create: {
                  id,
                  serviceId: savedService.id,
                  minWeight,
                  maxWeight,
                  price: service.prices[index],
                  label: legacyTierLabel(index) ?? 'Bậc giá demo',
                  species: legacySpecies as Species | null,
                },
                update: {
                  serviceId: savedService.id,
                  minWeight,
                  maxWeight,
                  price: service.prices[index],
                  label: legacyTierLabel(index) ?? 'Bậc giá demo',
                  species: legacySpecies as Species | null,
                },
              }),
          );
        }
      }

      for (const product of productSeeds) {
        const {
          specifications,
          tags,
          stock,
          reservedStock,
          reviewCount,
          rating,
          ...productData
        } = product;
        const savedProduct = await saveTracked(
          'Product',
          () =>
            tx.product.findUnique({
              where: { slug: product.slug },
              select: { id: true },
            }),
          () =>
            tx.product.upsert({
              where: { slug: product.slug },
              create: {
                ...productData,
                stock,
                reservedStock,
                reviewCount,
                rating,
                category: product.category as ProductCategory,
                suitableSpecies: product.suitableSpecies as Species | null,
                tags: [...tags],
                imageUrl: null,
              },
              update: {
                ...productData,
                category: product.category as ProductCategory,
                suitableSpecies: product.suitableSpecies as Species | null,
                tags: [...tags],
                imageUrl: null,
              },
            }),
        );
        report.products.push(product.name);

        for (let index = 0; index < specifications.length; index += 1) {
          const specification = specifications[index];
          const id = `${product.slug}-spec-${index + 1}`;
          await saveTracked(
            'ProductSpec',
            () =>
              tx.productSpec.findUnique({
                where: { id },
                select: { id: true },
              }),
            () =>
              tx.productSpec.upsert({
                where: { id },
                create: { id, productId: savedProduct.id, ...specification },
                update: { productId: savedProduct.id, ...specification },
              }),
          );
        }
      }

      for (const area of deliveryAreaSeeds) {
        await saveTracked(
          'DeliveryArea',
          () =>
            tx.deliveryArea.findUnique({
              where: {
                provinceKey_wardKey: {
                  provinceKey: area.provinceKey,
                  wardKey: area.wardKey,
                },
              },
              select: { id: true },
            }),
          () =>
            tx.deliveryArea.upsert({
              where: {
                provinceKey_wardKey: {
                  provinceKey: area.provinceKey,
                  wardKey: area.wardKey,
                },
              },
              create: { ...area, isActive: true },
              update: { ...area, isActive: true },
            }),
        );
      }

      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      for (const voucher of voucherSeeds) {
        const { discountType, ...voucherData } = voucher;
        await saveTracked(
          'Voucher',
          () =>
            tx.voucher.findUnique({
              where: { code: voucher.code },
              select: { id: true },
            }),
          () =>
            tx.voucher.upsert({
              where: { code: voucher.code },
              create: {
                ...voucherData,
                discountType: discountType as DiscountType,
                expiryDate,
                isActive: true,
                pointCost: null,
              },
              update: {
                ...voucherData,
                discountType: discountType as DiscountType,
                expiryDate,
                isActive: true,
                usageCount: 0,
                pointCost: null,
              },
            }),
        );
        report.vouchers.push(voucher.code);
      }

      const existingAdmin = await tx.user.findFirst({
        where: { role: Role.ADMIN },
        select: { id: true },
      });
      if (existingAdmin) {
        const counts = (report.rows.Admin ??= { new: 0, existing: 0 });
        counts.existing += 1;
      } else {
        const demoEmail = 'admin@example.test';
        const emailOwner = await tx.user.findUnique({
          where: { email: demoEmail },
          select: { id: true },
        });
        if (emailOwner) {
          const counts = (report.rows.Admin ??= { new: 0, existing: 0 });
          counts.existing += 1;
          report.warnings.push(
            `Không tạo Admin demo vì email ${demoEmail} đã được sử dụng; tài khoản hiện có được giữ nguyên.`,
          );
        } else {
          await tx.user.create({
            data: {
              email: demoEmail,
              name: 'Demo Administrator',
              role: Role.ADMIN,
              isEmailVerified: true,
              isActive: true,
            },
          });
          const counts = (report.rows.Admin ??= { new: 0, existing: 0 });
          counts.new += 1;
        }
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  console.log(
    'Seed demo hoàn tất; toàn bộ thay đổi đã commit trong một transaction.',
  );
  console.log('Số dòng mới / đã tồn tại:');
  for (const [model, counts] of Object.entries(report.rows)) {
    console.log(`  ${model}: ${counts.new} mới, ${counts.existing} đã tồn tại`);
  }
  console.log(`Dịch vụ: ${report.services.join(', ')}`);
  console.log(`Sản phẩm: ${report.products.join(', ')}`);
  console.log(`Voucher: ${report.vouchers.join(', ')}`);
  for (const warning of report.warnings) console.warn(`Cảnh báo: ${warning}`);
  console.log(
    'Không tạo booking, lịch hẹn, đơn hàng, thanh toán, giao dịch hoặc dữ liệu khách hàng.',
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  seedDemoData()
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : 'Seed demo thất bại.',
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
