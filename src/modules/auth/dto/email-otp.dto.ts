import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendEmailOtpDto {
  @ApiProperty({ example: 'khachhang@gmail.com', description: 'Email nhận mã OTP đăng nhập' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  email: string;
}

export class EmailOtpLoginDto {
  @ApiProperty({ example: 'khachhang@gmail.com', description: 'Email đăng nhập' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã xác thực OTP gồm 6 chữ số' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống.' })
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Mã OTP phải có đúng 6 chữ số.' })
  code: string;
}
