import { ApiProperty } from '@nestjs/swagger';
import { ContactRequestStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateContactRequestStatusDto {
  @ApiProperty({ enum: ContactRequestStatus })
  @IsEnum(ContactRequestStatus)
  status: ContactRequestStatus;
}
