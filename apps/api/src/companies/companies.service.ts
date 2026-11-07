import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ListCompaniesQuery } from './dto/review-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { slugify } from './slug';

const companyInclude = {
  owner: { select: { id: true, email: true, name: true, phone: true } },
} satisfies Prisma.CompanyInclude;

/** Which status changes an admin may make. */
const ALLOWED_TRANSITIONS: Record<CompanyStatus, CompanyStatus[]> = {
  PENDING: [CompanyStatus.APPROVED, CompanyStatus.REJECTED],
  REJECTED: [CompanyStatus.APPROVED],
  APPROVED: [CompanyStatus.SUSPENDED],
  SUSPENDED: [CompanyStatus.APPROVED],
};

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /** Returns a slug for the name that no other company uses. */
  async uniqueSlug(name: string, db: Prisma.TransactionClient = this.prisma, excludeId?: string) {
    const base = slugify(name);
    for (let n = 1; ; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      const taken = await db.company.findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (!taken) return slug;
    }
  }

  async findMine(ownerId: string) {
    const company = await this.prisma.company.findUnique({ where: { ownerId }, include: companyInclude });
    if (!company) throw new NotFoundException('You do not have a company yet');
    return company;
  }

  /**
   * Owners can edit their profile at any time. Editing a REJECTED company sends it
   * back to PENDING so the admin can review the changes.
   */
  async updateMine(ownerId: string, dto: UpdateCompanyDto) {
    const company = await this.findMine(ownerId);
    const data: Prisma.CompanyUpdateInput = { ...dto };
    if (dto.name && dto.name !== company.name) {
      data.slug = await this.uniqueSlug(dto.name, this.prisma, company.id);
    }
    if (company.status === CompanyStatus.REJECTED) {
      data.status = CompanyStatus.PENDING;
      data.rejectionReason = null;
    }
    return this.prisma.company.update({ where: { id: company.id }, data, include: companyInclude });
  }

  async setLogo(ownerId: string, file: { buffer: Buffer; size: number } | undefined) {
    const company = await this.findMine(ownerId);
    const logoUrl = await this.uploads.saveImage(file);
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: { logoUrl },
      include: companyInclude,
    });
    await this.uploads.remove(company.logoUrl);
    return updated;
  }

  async list(query: ListCompaniesQuery) {
    const where: Prisma.CompanyWhereInput = { status: query.status };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        include: companyInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.company.count({ where }),
    ]);
    return { items, total, page: query.page, perPage: query.perPage };
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id }, include: companyInclude });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  approve(id: string, adminId: string) {
    return this.transition(id, adminId, CompanyStatus.APPROVED);
  }

  reject(id: string, adminId: string, reason: string) {
    return this.transition(id, adminId, CompanyStatus.REJECTED, reason);
  }

  suspend(id: string, adminId: string) {
    return this.transition(id, adminId, CompanyStatus.SUSPENDED);
  }

  private async transition(id: string, adminId: string, to: CompanyStatus, reason?: string) {
    const company = await this.findById(id);
    if (!ALLOWED_TRANSITIONS[company.status].includes(to)) {
      throw new BadRequestException(`A ${company.status.toLowerCase()} company cannot be moved to ${to.toLowerCase()}`);
    }
    return this.prisma.company.update({
      where: { id },
      data: {
        status: to,
        rejectionReason: to === CompanyStatus.REJECTED ? reason : null,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
      include: companyInclude,
    });
  }
}
