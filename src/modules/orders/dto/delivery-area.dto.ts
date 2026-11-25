import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateDeliveryAreaDto {
  @ApiProperty({ example: 'Hà Nội' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province: string;

  @ApiProperty({ example: 'Phường Cầu Giấy' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ward: string;

  @ApiProperty({ example: 25000, minimum: 0 })
  @IsInt()
  @Min(0)
  fee: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateDeliveryAreaDto extends PartialType(CreateDeliveryAreaDto) {}
