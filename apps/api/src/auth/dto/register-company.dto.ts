import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { RegisterDto, trim } from './register.dto';

/** Signs up a company owner account and its company in one step. */
export class RegisterCompanyDto extends RegisterDto {
  @ApiProperty({ example: 'Silk Road Fashion' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://silkroad.example' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 'Tashkent, Amir Temur 1' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;
}
