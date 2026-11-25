import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Trần Minh Quân',
    description: 'Họ và tên cập nhật',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại liên lạc',
  })
  @IsOptional()
  @Matches(/^(0[3|5|7|8|9])[0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam (10 chữ số).',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    description: 'Đường dẫn ảnh đại diện',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
