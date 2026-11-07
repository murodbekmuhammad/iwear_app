import { Module } from '@nestjs/common';
import { CompanyProductsController } from './company-products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [CompanyProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
