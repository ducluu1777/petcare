import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdateVoucherDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ValidateIf((_object, value) => value !== -1)
  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @IsIn([1, -1])
  @IsOptional()
  usageLimitPerUser?: number;
}
