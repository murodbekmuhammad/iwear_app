import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompaniesService } from '../companies/companies.service';
import { ListCompaniesQuery, RejectCompanyDto } from '../companies/dto/review-company.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/companies')
export class AdminCompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@Query() query: ListCompaniesQuery) {
    return this.companies.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companies.findById(id);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser) {
    return this.companies.approve(id, admin.id);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser, @Body() dto: RejectCompanyDto) {
    return this.companies.reject(id, admin.id, dto.reason);
  }

  @Patch(':id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser) {
    return this.companies.suspend(id, admin.id);
  }
}
