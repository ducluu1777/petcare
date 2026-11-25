import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ description: 'Họ và tên khách hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Email khách hàng' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại (chỉ chứa số)' })
  @IsOptional()
  @Matches(/^[0-9]+$/, { message: 'Số điện thoại chỉ được chứa các chữ số' })
  @MaxLength(15)
  phone?: string;
}
