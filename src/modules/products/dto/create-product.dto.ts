import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, Species } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Royal Canin Poodle Adult' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'royal-canin-poodle-adult' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: ProductCategory })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ example: 350000, minimum: 1, description: 'Giá bán thực tế (VNĐ), phải lớn hơn 0.' })
  @IsInt()
  @Min(1)
  price: number;

  @ApiPropertyOptional({
    example: 380000,
    description: 'Giá gốc niêm yết',
    nullable: true,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  originalPrice?: number | null;

  @ApiProperty({
    example: 50,
    description: 'Tồn thực tế ban đầu; được ghi thành giao dịch tồn đầu kỳ khi tạo sản phẩm.',
  })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 'Thức ăn khô cho Poodle trưởng thành...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: Species })
  @IsEnum(Species)
  @IsOptional()
  suitableSpecies?: Species;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsOptional()
  minWeightKg?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsOptional()
  maxWeightKg?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @IsOptional()
  estimatedConsumptionDays?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['sensitive_stomach', 'adult'],
  })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;
}
