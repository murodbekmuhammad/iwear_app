import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_IMAGE_BYTES } from '../uploads/uploads.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { MAX_IMAGES_PER_PRODUCT, ProductsService } from './products.service';

/** The signed-in company owner's clothes. */
@ApiTags('company')
@ApiBearerAuth()
@Roles(Role.COMPANY)
@Controller('company/products')
export class CompanyProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.products.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(user.id, id);
  }

  @Post(':id/images')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES_PER_PRODUCT, { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  addImages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.products.addImages(user.id, id, files);
  }

  @Delete(':id/images/:imageId')
  removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.products.removeImage(user.id, id, imageId);
  }
}
