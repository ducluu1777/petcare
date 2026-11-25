import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { PriceTierDto } from './create-service.dto.js';

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSignature?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresVaccination?: boolean;

  @ApiPropertyOptional({ description: 'Đây là dịch vụ phụ trội (Add-on)' })
  @IsBoolean()
  @IsOptional()
  isAddon?: boolean;

  @ApiPropertyOptional({ description: 'Hiển thị dịch vụ để khách đặt mới.' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [PriceTierDto], description: 'Bảng giá theo cân nặng' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  @IsOptional()
  priceTiers?: PriceTierDto[];
}

export class SetPriceTiersDto {
  @ApiPropertyOptional({ type: [PriceTierDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  priceTiers: PriceTierDto[];
}
