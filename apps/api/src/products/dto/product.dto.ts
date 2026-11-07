import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Category } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trim } from '../../auth/dto/register.dto';

export class ProductSizeDto {
  @ApiProperty({ example: 'M' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Max(100000)
  stock: number;

  @ApiPropertyOptional({ example: 92, description: 'Chest / bust the size fits, in cm' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  chestCm?: number;

  @ApiPropertyOptional({ example: 74 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  waistCm?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  hipsCm?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Ikat silk summer dress' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiProperty({ enum: Category })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({ example: 450000, description: "Price in so'm" })
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price: number;

  @ApiPropertyOptional({ example: ['Blue', 'Gold'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  colors?: string[];

  @ApiProperty({ type: [ProductSizeDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one size' })
  @ArrayMaxSize(30)
  @ArrayUnique((size: ProductSizeDto) => size.label?.toLowerCase(), { message: 'Each size can only be listed once' })
  @ValidateNested({ each: true })
  @Type(() => ProductSizeDto)
  sizes: ProductSizeDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({ enum: Category })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  colors?: string[];

  @ApiPropertyOptional({ type: [ProductSizeDto], description: 'Replaces all sizes' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one size' })
  @ArrayMaxSize(30)
  @ArrayUnique((size: ProductSizeDto) => size.label?.toLowerCase(), { message: 'Each size can only be listed once' })
  @ValidateNested({ each: true })
  @Type(() => ProductSizeDto)
  sizes?: ProductSizeDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class StoreProductsQuery {
  @ApiPropertyOptional({ enum: Category })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;
}

export class ListStoresQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ListProductsQuery {
  @ApiPropertyOptional({ description: 'Matches the item name or its store name' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: Category })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit: number = 24;
}
