import { ApiPropertyOptional } from '@nestjs/swagger';
import { BehavioralFlag, Species } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const isDevelopmentImageDataUri = (value: unknown): boolean =>
  process.env.NODE_ENV !== 'production' &&
  typeof value === 'string' &&
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

export class UpdatePetDto {
  @ApiPropertyOptional({ example: 'Milo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: Species, example: Species.DOG })
  @IsEnum(Species)
  @IsOptional()
  species?: Species;

  @ApiPropertyOptional({ example: 'Poodle' })
  @IsString()
  @IsOptional()
  breed?: string;

  @ApiPropertyOptional({ example: 6.0 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(100)
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @Min(0)
  @IsOptional()
  ageMonths?: number | null;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => !isDevelopmentImageDataUri(value))
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasVaccine?: boolean;

  @ApiPropertyOptional({ enum: BehavioralFlag, example: BehavioralFlag.NORMAL })
  @IsEnum(BehavioralFlag)
  @IsOptional()
  behavioralFlag?: BehavioralFlag;
}

