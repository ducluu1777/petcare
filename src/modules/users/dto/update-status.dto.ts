import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ example: true, description: 'Trạng thái hoạt động của tài khoản (true = hoạt động, false = khóa)' })
  @IsBoolean({ message: 'isActive phải là boolean (true/false).' })
  isActive: boolean;
}
