import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateSpaBookingPromotionDto {
  @ApiProperty({ description: 'Ưu đãi đặt lịch Spa có đang áp dụng hay không' })
  @IsBoolean()
  active: boolean;
}
