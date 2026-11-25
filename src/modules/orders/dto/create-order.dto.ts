import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FulfillmentMethod, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: [PaymentMethod.BANK_TRANSFER], default: PaymentMethod.BANK_TRANSFER })
  @IsIn([PaymentMethod.BANK_TRANSFER])
  paymentMethod: 'BANK_TRANSFER';

  @ApiPropertyOptional({ enum: FulfillmentMethod, default: FulfillmentMethod.PICKUP })
  @IsEnum(FulfillmentMethod)
  @IsOptional()
  fulfillmentMethod?: FulfillmentMethod;

  @ApiPropertyOptional({ description: 'ID phường/xã PetCare nhận giao' })
  @IsUUID()
  @IsOptional()
  deliveryAreaId?: string;

  @ApiPropertyOptional({ description: 'Số nhà, đường và ghi chú địa chỉ giao' })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Phí giao khách đã xác nhận ở checkout' })
  @IsInt()
  @Min(0)
  @IsOptional()
  expectedDeliveryFee?: number;

  @ApiPropertyOptional({ description: 'Mã voucher' })
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'ID voucher (nếu truyền qua ID)' })
  @IsString()
  @IsOptional()
  voucherId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú giao nhận' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ nhận hàng' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Tên người nhận hàng' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại người nhận hàng' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

}
