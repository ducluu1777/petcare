import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductCategory, Species } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private withAvailableStock<
    T extends { stock: number; reservedStock: number },
  >(product: T) {
    const { reservedStock, ...publicProduct } = product;
    return {
      ...publicProduct,
      stock: Math.max(0, product.stock - reservedStock),
    };
  }

  async findAll(opts?: {
    category?: ProductCategory;
    species?: Species;
    isBestSeller?: boolean;
    isNew?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filters: Prisma.ProductWhereInput[] = [{ isActive: true }];
    if (opts?.category) filters.push({ category: opts.category });
    if (opts?.species !== undefined)
      filters.push({
        OR: [{ suitableSpecies: opts.species }, { suitableSpecies: null }],
      });
    if (opts?.isBestSeller !== undefined)
      filters.push({ isBestSeller: opts.isBestSeller });
    if (opts?.isNew !== undefined) filters.push({ isNew: opts.isNew });
    if (opts?.search?.trim()) {
      filters.push({
        OR: [
          { name: { contains: opts.search.trim(), mode: 'insensitive' } },
          { slug: { contains: opts.search.trim(), mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.ProductWhereInput = filters.length
      ? { AND: filters }
      : {};

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: products.map((product) => this.withAvailableStock(product)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllForAdmin(opts?: {
    category?: ProductCategory;
    species?: Species;
    isBestSeller?: boolean;
    isNew?: boolean;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;
    const filters: Prisma.ProductWhereInput[] = [];
    if (opts?.isActive !== undefined) filters.push({ isActive: opts.isActive });
    if (opts?.category) filters.push({ category: opts.category });
    if (opts?.species !== undefined)
      filters.push({
        OR: [{ suitableSpecies: opts.species }, { suitableSpecies: null }],
      });
    if (opts?.isBestSeller !== undefined)
      filters.push({ isBestSeller: opts.isBestSeller });
    if (opts?.isNew !== undefined) filters.push({ isNew: opts.isNew });
    if (opts?.search?.trim()) {
      filters.push({
        OR: [
          { name: { contains: opts.search.trim(), mode: 'insensitive' } },
          { slug: { contains: opts.search.trim(), mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.ProductWhereInput = filters.length
      ? { AND: filters }
      : {};
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          _count: { select: { orderItems: true, stockMovements: true } },
          stockMovements: {
            where: { type: 'OPENING_BALANCE' },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
              quantity: true,
              createdAt: true,
              performedBy: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { isBestSeller: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
    ]);
    return {
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAdminSummary() {
    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        reservedStock: true,
        isActive: true,
      },
    });
    const activeProducts = products.filter((product) => product.isActive);
    const withAvailableStock = activeProducts.map((product) => ({
      ...product,
      availableStock: Math.max(0, product.stock - product.reservedStock),
    }));
    const lowStock = withAvailableStock.filter(
      (product) => product.availableStock > 0 && product.availableStock <= LOW_STOCK_THRESHOLD,
    ).length;
    const outOfStock = withAvailableStock.filter((product) => product.availableStock === 0).length;
    const restockProducts = withAvailableStock
      .filter((product) => product.availableStock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.availableStock - b.availableStock || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map(({ availableStock, id, name, category, stock }) => ({
        id,
        name,
        category,
        stock: availableStock,
        physicalStock: stock,
      }));

    const totalInventoryValue = products.reduce(
      (sum, product) => sum + Number(product.price) * product.stock,
      0,
    );
    return {
      total: activeProducts.length,
      lowStock,
      outOfStock,
      totalInventoryValue,
      restockProducts,
    };
  }

  /** Gợi ý sản phẩm theo AI metadata: species, weightKg, tags */
  async recommend(species?: Species, weightKg?: number, tags?: string[]) {
    const filters: Prisma.ProductWhereInput[] = [];
    if (species)
      filters.push({
        OR: [{ suitableSpecies: species }, { suitableSpecies: null }],
      });
    if (weightKg !== undefined && weightKg !== null) {
      filters.push({
        OR: [
          {
            AND: [
              { minWeightKg: { lte: weightKg } },
              { maxWeightKg: { gte: weightKg } },
            ],
          },
          { AND: [{ minWeightKg: null }, { maxWeightKg: null }] },
        ],
      });
    }
    const where: Prisma.ProductWhereInput = filters.length
      ? { AND: filters }
      : {};

    const products = await this.prisma.product.findMany({
      where: { ...where, isActive: true },
    });

    // Filter bằng tag (JSON containment) — nếu có tags thì lọc
    if (tags?.length) {
      return products
        .filter((p) => {
          const productTags = (p.tags as string[]) ?? [];
          return tags.some((t) => productTags.includes(t));
        })
        .map((product) => this.withAvailableStock(product));
    }

    return products.map((product) => this.withAvailableStock(product));
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { specifications: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return this.withAvailableStock(product);
  }

  async create(dto: CreateProductDto, performedById: string) {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        'Mã sản phẩm đã được sử dụng. Hãy chọn mã khác.',
      );
    }
    const { tags, ...productData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          tags: tags ?? [],
        },
      });

      await tx.productStockMovement.create({
        data: {
          productId: product.id,
          type: 'OPENING_BALANCE',
          quantity: dto.stock,
          stockBefore: 0,
          stockAfter: dto.stock,
          reason: 'Tồn đầu kỳ',
          performedById,
        },
      });

      return product;
    });
  }

  async update(
    id: string,
    dto: Partial<Omit<CreateProductDto, 'stock'>> & { isActive?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
      return tx.product.update({ where: { id }, data: dto });
    });
  }

  async adjustStock(
    id: string,
    dto: AdjustProductStockDto,
    performedById: string,
  ) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('Nhập lý do điều chỉnh tồn kho.');
    }
    if (!Number.isInteger(dto.quantity) || dto.quantity === 0) {
      throw new BadRequestException('Số lượng điều chỉnh phải là số nguyên khác 0.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ${id} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');

      const stockAfter = product.stock + dto.quantity;
      if (stockAfter < 0) {
        throw new BadRequestException('Tồn sau điều chỉnh không thể thấp hơn 0.');
      }
      if (stockAfter < product.reservedStock) {
        throw new ConflictException(
          `Tồn sau điều chỉnh không thể thấp hơn ${product.reservedStock} sản phẩm đang giữ cho giao dịch QR.`,
        );
      }
      if (stockAfter > 2_147_483_647) {
        throw new BadRequestException('Số tồn sau điều chỉnh vượt giới hạn cho phép.');
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: { stock: stockAfter },
      });
      const movement = await tx.productStockMovement.create({
        data: {
          productId: id,
          type: 'ADJUSTMENT',
          quantity: dto.quantity,
          stockBefore: product.stock,
          stockAfter,
          reason,
          performedById,
        },
        include: { performedBy: { select: { id: true, name: true } } },
      });

      return { product: updatedProduct, movement };
    });
  }

  async findStockMovements(id: string, page = 1, limit = 20) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, stock: true, reservedStock: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');

    const safePage = Number.isFinite(page)
      ? Math.max(1, Math.floor(page))
      : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(50, Math.max(1, Math.floor(limit)))
      : 20;
    const [total, data] = await Promise.all([
      this.prisma.productStockMovement.count({ where: { productId: id } }),
      this.prisma.productStockMovement.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { performedBy: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      product,
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    const historicalOrderItem = await this.prisma.orderItem.findFirst({
      where: { productId: id },
      select: { id: true },
    });
    if (historicalOrderItem) {
      throw new ConflictException(
        'Sản phẩm đã có trong đơn hàng. Hãy ngừng bán để giữ lịch sử giao dịch.',
      );
    }
    const stockMovement = await this.prisma.productStockMovement.findFirst({
      where: { productId: id },
      select: { id: true },
    });
    if (stockMovement) {
      throw new ConflictException(
        'Sản phẩm đã có lịch sử tồn kho. Hãy ngừng bán để giữ dữ liệu đối soát.',
      );
    }
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Đã xóa sản phẩm chưa phát sinh giao dịch.' };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return product;
  }
}
