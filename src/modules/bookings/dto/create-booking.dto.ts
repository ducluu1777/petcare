import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ enum: BookingType })
  @IsEnum(BookingType)
  type: BookingType;

  @ApiProperty({ description: 'ID thú cưng' })
  @IsString()
  petId: string;

  @ApiProperty({ type: [String], description: 'Danh sách serviceId (main + addons)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds: string[];

  @ApiPropertyOptional({ description: 'ID khung giờ (chỉ dùng cho SPA)' })
  @IsString()
  @IsOptional()
  timeSlotId?: string;

  @ApiPropertyOptional({ description: 'ID khách hàng (dành cho Staff/Admin tiếp nhận tại quầy)' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú nghiệp vụ / tiếp nhận' })
  @IsString()
  @IsOptional()
  staffNote?: string;

  @ApiPropertyOptional({ description: 'ID nhân viên phân công' })
  @IsString()
  @IsOptional()
  assignedStaffId?: string;
}
