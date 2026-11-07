import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ListStoresQuery, StoreProductsQuery } from '../products/dto/product.dto';
import { StoresService } from './stores.service';

@ApiTags('stores (public)')
@Public()
@Controller()
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get('stores')
  list(@Query() query: ListStoresQuery) {
    return this.stores.listStores(query.search);
  }

  @Get('stores/:slug')
  get(@Param('slug') slug: string, @Query() query: StoreProductsQuery) {
    return this.stores.getStore(slug, query.category);
  }

  @Get('products/:id')
  product(@Param('id', ParseUUIDPipe) id: string) {
    return this.stores.getProduct(id);
  }
}
