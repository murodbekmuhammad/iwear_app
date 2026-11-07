import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, CompanyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Only approved companies and their published products are visible to the public. */
const visibleProduct = {
  isPublished: true,
  company: { status: CompanyStatus.APPROVED },
} satisfies Prisma.ProductWhereInput;

const publicStoreSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  website: true,
  phone: true,
  logoUrl: true,
} satisfies Prisma.CompanySelect;

const productCardSelect = {
  id: true,
  name: true,
  category: true,
  price: true,
  colors: true,
  images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
  sizes: { select: { label: true, stock: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductSelect;

/** Public browsing: no login needed. */
@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async listStores(search?: string) {
    const stores = await this.prisma.company.findMany({
      where: {
        status: CompanyStatus.APPROVED,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        ...publicStoreSelect,
        _count: { select: { products: { where: { isPublished: true } } } },
        products: {
          where: { isPublished: true, images: { some: {} } },
          select: { images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { name: 'asc' },
    });
    return stores.map(({ _count, products, ...store }) => ({
      ...store,
      productCount: _count.products,
      previewImages: products.flatMap((product) => product.images.map((image) => image.url)),
    }));
  }

  async getStore(slug: string, category?: Category) {
    const store = await this.prisma.company.findFirst({
      where: { slug, status: CompanyStatus.APPROVED },
      select: publicStoreSelect,
    });
    if (!store) throw new NotFoundException('Store not found');

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { companyId: store.id, isPublished: true, category },
        select: productCardSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.groupBy({
        by: ['category'],
        where: { companyId: store.id, isPublished: true },
        orderBy: { category: 'asc' },
      }),
    ]);
    return { ...store, categories: categories.map((row) => row.category), products };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...visibleProduct },
      select: {
        ...productCardSelect,
        description: true,
        images: { select: { id: true, url: true }, orderBy: { sortOrder: 'asc' } },
        sizes: {
          select: { label: true, stock: true, chestCm: true, waistCm: true, hipsCm: true },
          orderBy: { sortOrder: 'asc' },
        },
        company: { select: { name: true, slug: true, logoUrl: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
