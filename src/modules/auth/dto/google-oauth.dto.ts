import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleOAuthDto {
  @ApiProperty({
    example: 'accounts.google.com/oauth2/token/...',
    description: 'ID Token từ Google SDK phía Client',
  })
  @IsString()
  @IsNotEmpty({ message: 'idToken không được để trống.' })
  idToken!: string;

  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email Google của người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @ApiProperty({
    example: 'Trần Văn Google',
    description: 'Họ tên tài khoản Google',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống.' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/a/...',
    description: 'Ảnh đại diện từ Google',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    example: '11223344556677889900',
    description: 'Google Provider Account ID (sub từ Google Token)',
  })
  @IsString()
  @IsNotEmpty({ message: 'providerAccountId không được để trống.' })
  providerAccountId!: string;
}
