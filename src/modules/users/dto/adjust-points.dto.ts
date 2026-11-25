import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class AdjustPointsDto {
  @ApiProperty({ description: 'Số điểm cần cộng (dương) hoặc trừ (âm)', example: 100 })
  @IsInt()
  points: number;

  @ApiProperty({ description: 'Lý do điều chỉnh điểm', example: 'Tặng điểm tri ân khách hàng thân thiết' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
