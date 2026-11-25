import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, BookingType } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiPropertyOptional({ description: 'Ghi chú nội bộ khi chuyển trạng thái' })
  @IsString()
  @IsOptional()
  staffNote?: string;

  @ApiPropertyOptional({ description: 'Lý do hủy lịch để lưu vào lịch sử tra cứu' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Lý do hủy lịch, tối đa 500 ký tự' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class UpdateBookingAddonsDto {
  @ApiPropertyOptional({ type: [String], description: 'Danh sách serviceId addon muốn thêm' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  addServiceIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'bookingServiceId muốn xóa khỏi đơn' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  removeBookingServiceIds?: string[];
}

export class CreateBookingReweighQuoteDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(100)
  weightKg: number;
}

export class DecideBookingReweighDto {
  @IsIn(['ACCEPT', 'DECLINE'])
  decision: 'ACCEPT' | 'DECLINE';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(100)
  weightKg: number;

}

export class AssignStaffDto {
  @ApiProperty({ description: 'ID nhân viên phụ trách' })
  @IsUUID()
  staffId: string;
}

export class QueryBookingDto {
  @ApiPropertyOptional({ enum: BookingType })
  @IsEnum(BookingType)
  @IsOptional()
  type?: BookingType;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: ['WAITING_CHECKIN', 'ARRIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CANCELLED_OR_NO_SHOW'] })
  @IsIn(['WAITING_CHECKIN', 'ARRIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CANCELLED_OR_NO_SHOW'])
  @IsOptional()
  statusFilter?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã lịch, tên khách, số điện thoại hoặc tên thú cưng' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Ngày bắt đầu (bao gồm)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Ngày kết thúc (không bao gồm)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
