import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateProductDto, ProductSizeDto, UpdateProductDto } from './dto/product.dto';

export const MAX_IMAGES_PER_PRODUCT = 8;

const productInclude = {
  sizes: { orderBy: { sortOrder: 'asc' } },
  images: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductInclude;

function sizeRows(sizes: ProductSizeDto[]) {
  return sizes.map((size, index) => ({ ...size, sortOrder: index }));
}

/** Product management for the signed-in company owner. Every query is scoped to their company. */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  private async companyIdFor(ownerId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { ownerId }, select: { id: true, status: true } });
    if (!company) throw new NotFoundException('You do not have a company yet');
    if (company.status === CompanyStatus.SUSPENDED) {
      throw new BadRequestException('Your company is suspended, so its clothes cannot be changed');
    }
    return company.id;
  }

  private async findOwned(ownerId: string, productId: string) {
    const companyId = await this.companyIdFor(ownerId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async list(ownerId: string) {
    const company = await this.prisma.company.findUnique({ where: { ownerId }, select: { id: true } });
    if (!company) throw new NotFoundException('You do not have a company yet');
    return this.prisma.product.findMany({
      where: { companyId: company.id },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  get(ownerId: string, productId: string) {
    return this.findOwned(ownerId, productId);
  }

  async create(ownerId: string, dto: CreateProductDto) {
    const companyId = await this.companyIdFor(ownerId);
    const { sizes, ...fields } = dto;
    return this.prisma.product.create({
      data: { ...fields, colors: dto.colors ?? [], companyId, sizes: { create: sizeRows(sizes) } },
      include: productInclude,
    });
  }

  async update(ownerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findOwned(ownerId, productId);
    const { sizes, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (sizes) {
        await tx.productSize.deleteMany({ where: { productId: product.id } });
        await tx.productSize.createMany({ data: sizeRows(sizes).map((s) => ({ ...s, productId: product.id })) });
      }
      return tx.product.update({ where: { id: product.id }, data: fields, include: productInclude });
    });
  }

  async remove(ownerId: string, productId: string) {
    const product = await this.findOwned(ownerId, productId);
    await this.prisma.product.delete({ where: { id: product.id } });
    await Promise.all(product.images.map((image) => this.uploads.remove(image.url)));
  }

  async addImages(ownerId: string, productId: string, files: { buffer: Buffer; size: number }[] | undefined) {
    const product = await this.findOwned(ownerId, productId);
    if (!files?.length) throw new BadRequestException('Choose at least one photo');
    if (product.images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestException(`A product can have up to ${MAX_IMAGES_PER_PRODUCT} photos`);
    }
    const urls: string[] = [];
    try {
      for (const file of files) urls.push(await this.uploads.saveImage(file));
    } catch (error) {
      await Promise.all(urls.map((url) => this.uploads.remove(url)));
      throw error;
    }
    const start = product.images.reduce((max, image) => Math.max(max, image.sortOrder + 1), 0);
    await this.prisma.productImage.createMany({
      data: urls.map((url, index) => ({ url, productId: product.id, sortOrder: start + index })),
    });
    return this.findOwned(ownerId, productId);
  }

  async removeImage(ownerId: string, productId: string, imageId: string) {
    const product = await this.findOwned(ownerId, productId);
    const image = product.images.find((candidate) => candidate.id === imageId);
    if (!image) throw new NotFoundException('Photo not found');
    await this.prisma.productImage.delete({ where: { id: image.id } });
    await this.uploads.remove(image.url);
    return this.findOwned(ownerId, productId);
  }
}
