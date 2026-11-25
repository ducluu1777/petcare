import { ApiProperty } from '@nestjs/swagger';
import { BehavioralFlag } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetBehavioralFlagDto {
  @ApiProperty({
    enum: BehavioralFlag,
    example: BehavioralFlag.AGGRESSIVE,
    description: 'Cờ hành vi: NORMAL, AGGRESSIVE (Hung dữ), TIMID (Nhát)',
  })
  @IsEnum(BehavioralFlag)
  behavioralFlag: BehavioralFlag;
}
