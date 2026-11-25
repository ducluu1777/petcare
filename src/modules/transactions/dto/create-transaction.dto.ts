import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionType } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ description: 'ID lịch hẹn' })
  @IsString()
  bookingId: string;

  @ApiProperty({ example: 500000, description: 'Số tiền (VNĐ)' })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: [TransactionType.FINAL_PAYMENT, TransactionType.REFUND] })
  @IsIn([TransactionType.FINAL_PAYMENT, TransactionType.REFUND])
  type: Exclude<TransactionType, 'DEPOSIT'>;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'URL ảnh biên lai' })
  @IsUrl()
  @IsOptional()
  proofUrl?: string;

  @ApiPropertyOptional({ description: 'Mã voucher khuyến mãi do thu ngân áp dụng' })
  @IsString()
  @IsOptional()
  voucherCode?: string;
}
