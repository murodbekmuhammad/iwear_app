import { Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_IMAGE_BYTES } from '../uploads/uploads.service';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

/** The signed-in company owner's own company. */
@ApiTags('company')
@ApiBearerAuth()
@Roles(Role.COMPANY)
@Controller('company')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  findMine(@CurrentUser() user: AuthUser) {
    return this.companies.findMine(user.id);
  }

  @Patch()
  updateMine(@CurrentUser() user: AuthUser, @Body() dto: UpdateCompanyDto) {
    return this.companies.updateMine(user.id, dto);
  }

  @Post('logo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  setLogo(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.companies.setLogo(user.id, file);
  }
}
