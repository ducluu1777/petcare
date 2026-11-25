import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Species, BehavioralFlag } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreatePetDto {
  @ApiPropertyOptional({ example: 'Milo', description: 'Tên thú cưng (Tùy chọn, mặc định Bé Cún hoặc Bé Mèo)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: Species, example: Species.DOG })
  @IsEnum(Species)
  species: Species;

  @ApiProperty({ example: 'Poodle' })
  @IsString()
  @IsNotEmpty()
  breed: string;

  @ApiProperty({ example: 5.5, description: 'Cân nặng (kg)' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(100)
  weightKg: number;

  @ApiPropertyOptional({ example: 24, description: 'Tuổi (tháng)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  ageMonths?: number;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Dị ứng với thịt gà, thích tắm' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Thông tin tiêm phòng của thú cưng' })
  @IsOptional()
  hasVaccine?: boolean;

  @ApiPropertyOptional({ enum: BehavioralFlag, example: BehavioralFlag.NORMAL, description: 'Cảnh báo đặc tính an toàn' })
  @IsEnum(BehavioralFlag)
  @IsOptional()
  behavioralFlag?: BehavioralFlag;

  @ApiPropertyOptional({ description: 'ID chủ nuôi; Admin/Staff phải chọn tài khoản khách đang hoạt động khi tạo hồ sơ tại quầy' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
