import { BadRequestException, Body, ConflictException, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { publicUserSelect, UsersService } from '../users/users.service';
import { CreateCourierDto, ListUsersQuery, SetActiveDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('users')
  async list(@Query() query: ListUsersQuery) {
    const [items, total] = await this.users.list({
      role: query.role,
      search: query.search,
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    });
    return { items, total, page: query.page, perPage: query.perPage };
  }

  @Patch('users/:id/active')
  setActive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser, @Body() dto: SetActiveDto) {
    if (id === admin.id) throw new BadRequestException('You cannot deactivate your own account');
    return this.users.setActive(id, dto.isActive);
  }

  @Post('couriers')
  async createCourier(@Body() dto: CreateCourierDto) {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          passwordHash: await bcrypt.hash(dto.password, 10),
          role: Role.COURIER,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }
}
