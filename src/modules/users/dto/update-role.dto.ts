import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({
    example: Role.STAFF,
    enum: Role,
    description: 'Vai trò mới của người dùng (CUSTOMER, STAFF, ADMIN)',
  })
  @IsEnum(Role)
  role: Role;
}
