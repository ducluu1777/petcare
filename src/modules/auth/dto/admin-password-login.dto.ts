import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminPasswordLoginDto {
  @ApiProperty({ example: 'admin@petcare.vn', description: 'Email tài khoản Admin hoặc Staff' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @ApiProperty({ description: 'Mật khẩu tài khoản nội bộ' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @MaxLength(128, { message: 'Mật khẩu không hợp lệ.' })
  password!: string;
}
