import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory, Species } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

export class PriceTierDto {
  @ApiProperty({ example: 0, description: 'Cân tối thiểu (kg)' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  minWeight: number;

  @ApiProperty({ example: 5, description: 'Cân tối đa (kg)' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  maxWeight: number;

  @ApiProperty({ example: 150000, description: 'Giá (VNĐ)' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 'Dưới 5 kg',
    description: 'Nhãn được tự sinh từ khoảng cân nặng; giá trị gửi từ client chỉ giữ tương thích ngược.',
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ enum: Species, description: 'Chỉ áp dụng loài (null = cả hai)' })
  @IsEnum(Species)
  @IsOptional()
  species?: Species;
}

export class CreateServiceDto {
  @ApiProperty({ example: 'Tắm Thảo Mộc Cao Cấp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'tam-thao-moc-cao-cap' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Thơm tho, mềm mượt, thư giãn' })
  @IsString()
  @IsNotEmpty()
  tagline: string;

  @ApiProperty({ example: 'Quy trình tắm 5 bước với tinh dầu tự nhiên...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSignature?: boolean;

  @ApiPropertyOptional({ description: 'Đây là dịch vụ phụ trội (Add-on)' })
  @IsBoolean()
  @IsOptional()
  isAddon?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresVaccination?: boolean;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ type: [PriceTierDto], description: 'Bảng giá theo cân nặng' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  priceTiers: PriceTierDto[];
}
