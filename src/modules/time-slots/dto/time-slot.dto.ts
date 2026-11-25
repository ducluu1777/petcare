import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotPeriod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSingleSlotDto {
  @ApiProperty({ example: '2026-10-01', description: 'Ngày hẹn YYYY-MM-DD' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có định dạng YYYY-MM-DD.' })
  slotDate: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Giờ phải có định dạng HH:mm hợp lệ.' })
  slotTime: string;

  @ApiProperty({ enum: SlotPeriod })
  @IsEnum(SlotPeriod)
  period: SlotPeriod;

  @ApiPropertyOptional({ example: 5, description: 'Sức chứa mặc định 5' })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export class BulkCreateTimeSlotsDto {
  @ApiProperty({ type: [CreateSingleSlotDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSingleSlotDto)
  slots: CreateSingleSlotDto[];
}

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({ example: 8 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
