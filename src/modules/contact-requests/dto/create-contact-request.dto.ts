import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const CONTACT_TOPICS = ['tu-van-spa', 'doi-huy-lich', 'phan-hoi', 'khac'] as const;

export class CreateContactRequestDto {
  @ApiProperty({ example: 'Minh Anh' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '0941900966' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: 'minhanh@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ enum: CONTACT_TOPICS })
  @IsIn(CONTACT_TOPICS)
  topic: (typeof CONTACT_TOPICS)[number];

  @ApiPropertyOptional({ example: 'Mèo 4,5 kg' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  petInfo?: string;

  @ApiProperty({ example: 'Mình muốn hỏi về dịch vụ tắm cho mèo.' })
  @IsString()
  @MinLength(6)
  @MaxLength(3000)
  message: string;
}
