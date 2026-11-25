import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role, type User } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsString, MaxLength } from 'class-validator';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AiBookingService } from './ai-booking.service.js';

export class AiBookingDraftDto {
  @IsString() @MaxLength(100) petId: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @IsString({ each: true }) serviceIds: string[];
  @IsDateString() startAt: string;
}

export class AiBookingSlotsDto {
  @IsDateString({ strict: true }) date: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @IsString({ each: true }) serviceIds: string[];
}

export class AiBookingConfirmDto {
  @IsString() @MaxLength(6000) token: string;
}

@Controller('ai/booking')
@Roles(Role.CUSTOMER)
export class AiWorkflowController {
  constructor(private readonly booking: AiBookingService) {}

  @Get('options')
  options(@CurrentUser() user: User) { return this.booking.options(user.id); }

  @Post('slots')
  slots(@CurrentUser() user: User, @Body() input: AiBookingSlotsDto) { return this.booking.slots(user.id, input); }

  @Post('preview')
  preview(@CurrentUser() user: User, @Body() input: AiBookingDraftDto) { return this.booking.prepare(user.id, input); }

  @Post('confirm')
  confirm(@CurrentUser() user: User, @Body() input: AiBookingConfirmDto) { return this.booking.confirm(user.id, input.token); }
}
