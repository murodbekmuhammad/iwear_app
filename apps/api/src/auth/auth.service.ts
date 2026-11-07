import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';
import { PublicUser, UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly companies: CompaniesService,
  ) {}

  /** Customer self-sign-up. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.createUnique(() =>
      this.prisma.user.create({
        data: { email: dto.email, name: dto.name, phone: dto.phone, passwordHash, role: Role.CUSTOMER },
      }),
    );
    return this.issue(user.id, user.role);
  }

  /** Company sign-up: creates the owner account and a PENDING company for admin review. */
  async registerCompany(dto: RegisterCompanyDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.createUnique(() =>
      this.prisma.$transaction(async (tx) => {
        const owner = await tx.user.create({
          data: { email: dto.email, name: dto.name, phone: dto.phone, passwordHash, role: Role.COMPANY },
        });
        await tx.company.create({
          data: {
            name: dto.companyName,
            slug: await this.companies.uniqueSlug(dto.companyName, tx),
            description: dto.description,
            website: dto.website,
            address: dto.address,
            phone: dto.phone,
            ownerId: owner.id,
          },
        });
        return owner;
      }),
    );
    return this.issue(user.id, user.role);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new UnauthorizedException('Wrong email or password');
    if (!user.isActive) throw new UnauthorizedException('This account has been deactivated');
    return this.issue(user.id, user.role);
  }

  me(userId: string): Promise<PublicUser> {
    return this.users.findPublicById(userId);
  }

  private async issue(userId: string, role: Role): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: userId, role };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user: await this.users.findPublicById(userId) };
  }

  /** Maps a unique-email violation to a friendly 409. */
  private async createUnique<T>(create: () => Promise<T>): Promise<T> {
    try {
      return await create();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }
}
