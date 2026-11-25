import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmBankTransferDto {
  @ApiPropertyOptional({
    description: 'Mã giao dịch đối chiếu từ SePay, nếu có. Webhook gửi mã này tự động.',
    type: [String],
    example: ['FT26293123456', 'FT26293123457'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  references?: string[];

  @ApiProperty({ description: 'Tổng số tiền nhân viên đã đối chiếu trên tài khoản nhận' })
  @IsInt()
  @Min(1)
  receivedAmount: number;

  @ApiPropertyOptional({ description: 'Bắt buộc bật khi đã hoàn phần tiền chuyển dư bên ngoài PetCare' })
  @IsBoolean()
  @IsOptional()
  excessRefunded?: boolean;
}
