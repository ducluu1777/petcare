import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBookingQrIntentDto {
  @ApiProperty({ description: 'ID lịch hẹn cần thanh toán' })
  @IsString()
  bookingId: string;

  @ApiPropertyOptional({ description: 'Mã voucher áp dụng cho lịch hẹn' })
  @IsString()
  @IsOptional()
  voucherCode?: string;
}
