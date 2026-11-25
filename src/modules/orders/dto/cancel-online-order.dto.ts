import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelOnlineOrderDto {
  @ApiProperty({ description: 'Lý do hủy đơn' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Bắt buộc khi hủy đơn giao thất bại: xác nhận hàng đã về cửa hàng' })
  @IsBoolean()
  @IsOptional()
  goodsReturned?: boolean;
}
