import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsObject, IsString, Min } from 'class-validator';

export type ShopOpenHours = Record<string, { open: string; close: string } | null>;

export class UpdateShopSettingsDto {
  @ApiProperty({ minimum: 1, description: 'Số booking tối đa bắt đầu trong mỗi khung 30 phút' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ minimum: 0, example: 50000, description: 'Phí chăm giữ thu một lần nếu thú cưng còn chờ nhận sau giờ đóng cửa' })
  @IsInt()
  @Min(0)
  latePickupFeeAmount: number;

  @ApiProperty({ description: 'Giờ mở và đóng cửa theo thứ trong tuần; null nghĩa là đóng cửa' })
  @IsObject()
  openHours: ShopOpenHours;

  @ApiProperty({ type: [String], description: 'Danh sách ngày nghỉ, định dạng YYYY-MM-DD' })
  @IsArray()
  @IsString({ each: true })
  holidays: string[];
}
