import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: 'Tên người dùng mới' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Email mới' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại mới (VN)' })
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @IsOptional()
  phone?: string;
}
