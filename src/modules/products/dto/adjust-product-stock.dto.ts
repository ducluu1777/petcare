import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

export class AdjustProductStockDto {
  @ApiProperty({
    example: -3,
    description: 'Số lượng tăng là số dương; số lượng giảm là số âm.',
  })
  @IsInt()
  @NotEquals(0)
  @Min(-2_147_483_647)
  @Max(2_147_483_647)
  quantity: number;

  @ApiProperty({ example: 'Kiểm kê thực tế thiếu 3 chai.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}
