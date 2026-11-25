import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class InStoreSaleItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateInStoreSaleDto {
  @ApiProperty({ type: [InStoreSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InStoreSaleItemDto)
  items: InStoreSaleItemDto[];

  @ApiPropertyOptional({ description: 'Tài khoản khách hàng để tích điểm; bỏ trống cho khách lẻ.' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Mã voucher của tài khoản khách đã chọn.' })
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiProperty({ enum: [PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER] })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
