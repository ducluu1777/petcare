import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto.js';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['stock'] as const),
) {
  @ApiPropertyOptional({ description: 'Hiển thị sản phẩm để bán trên cửa hàng trực tuyến.' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
