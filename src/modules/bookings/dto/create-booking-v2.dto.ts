import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { BookingSource, BookingStatusV2 } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateBookingV2Dto {
  @ApiProperty({ description: 'ID thú cưng' })
  @IsString()
  petId: string;

  @ApiProperty({ type: [String], description: 'Danh sách ID dịch vụ (chính + add-ons)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds: string[];

  @ApiPropertyOptional({ description: 'Giờ bắt đầu ca hẹn (ISO 8601). Không cần truyền nếu source = WALK_IN' })
  @IsString()
  @IsOptional()
  startAt?: string;

  @ApiPropertyOptional({ description: 'ID khách hàng; bắt buộc với Admin/Staff khi tạo booking tại quầy' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Phụ phí phát sinh (chỉ Staff/Admin)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  extraPrice?: number;

  @ApiPropertyOptional({ description: 'Số tiền giảm giá / voucher', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: 'Ghi chú của nhân viên' })
  @IsString()
  @IsOptional()
  staffNote?: string;

  @ApiPropertyOptional({ enum: BookingSource, description: 'Nguồn đặt lịch (chỉ Staff/Admin được chỉ định WALK_IN hoặc RECEPTIONIST)' })
  @IsEnum(BookingSource)
  @IsOptional()
  source?: BookingSource;

  @ApiPropertyOptional({ description: 'Lý do nhận walk-in vượt công suất Spa (chỉ Staff/Admin; bắt buộc khi công suất đã kín)' })
  @IsString()
  @IsOptional()
  capacityOverrideReason?: string;
}

export class RescheduleBookingDto {
  @ApiProperty({ description: 'Giờ hẹn mới (ISO 8601)' })
  @IsString()
  newStartAt: string;

  @ApiPropertyOptional({ description: 'Bật cờ nhận vượt chỗ (chỉ Staff/Admin)', default: false })
  @IsBoolean()
  @IsOptional()
  force?: boolean;

  @ApiPropertyOptional({ description: 'Lý do đổi giờ' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: BookingStatusV2, description: 'Trạng thái hiện tại mong muốn (chống đua lệnh / bấm đúp)' })
  @IsEnum(BookingStatusV2)
  fromStatus: BookingStatusV2;

  @ApiProperty({ enum: BookingStatusV2, description: 'Trạng thái đích muốn chuyển sang' })
  @IsEnum(BookingStatusV2)
  toStatus: BookingStatusV2;

  @ApiPropertyOptional({ description: 'Lý do chuyển sang Không đến (bắt buộc khi đánh dấu no-show)' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Bật cờ nhận vượt trạm nếu cần' })
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}

export class QueryAvailableSlotsDto {
  @ApiProperty({ description: 'Ngày muốn tra cứu (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ type: [String], description: 'Danh sách ID dịch vụ' })
  @Transform(({ value }) => {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value;
    return Array.isArray(values) ? values.map((item) => String(item).trim()).filter(Boolean) : values;
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds: string[];

  @ApiPropertyOptional({ description: 'ID thú cưng (dùng để tự tra sizeTier)' })
  @IsString()
  @IsOptional()
  petId?: string;

  @ApiPropertyOptional({ description: 'ID nhóm kích thước (nếu khách chưa chọn pet)' })
  @IsString()
  @IsOptional()
  sizeTierId?: string;

  @ApiPropertyOptional({ description: 'Cân nặng để tra nhóm kích thước khi tạo hồ sơ thú cưng mới' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @IsOptional()
  weightKg?: number;
}
