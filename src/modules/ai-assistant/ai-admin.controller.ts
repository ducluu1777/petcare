import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { AiAdminService } from './ai-admin.service.js';

class UpdateAiSettingsDto {
  @IsInt()
  @Min(1)
  @Max(100_000)
  dailyRequestLimit: number;
}

class KnowledgeEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  answer?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12_000)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  source?: string;

  @IsDateString()
  @IsOptional()
  reviewedAt?: string;
}

class UpdateKnowledgeEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  answer?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12_000)
  content: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  source: string;

  @IsDateString()
  reviewedAt: string;
}

class UpdateKnowledgeEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

@ApiTags('AI Assistant Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('ai/admin')
export class AiAdminController {
  constructor(private readonly aiAdminService: AiAdminService) {}

  @Get('overview')
  getOverview(@Query('days') days?: string) {
    return this.aiAdminService.getOverview(days === undefined ? 7 : Number(days));
  }

  @Get('dashboard')
  getDashboard(@Query('page') page?: string) {
    return this.aiAdminService.getDashboard(page ? Number(page) : 1);
  }

  @Get('usage/:requestId')
  getUsage(@Param('requestId') requestId: string) {
    return this.aiAdminService.getUsage(requestId);
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateAiSettingsDto) {
    return this.aiAdminService.updateSettings(dto.dailyRequestLimit);
  }

  @Get('knowledge')
  listKnowledge() {
    return this.aiAdminService.listKnowledge();
  }

  @Post('knowledge')
  createKnowledge(@Body() dto: KnowledgeEntryDto) {
    return this.aiAdminService.createKnowledgeEntry(dto);
  }

  @Patch('knowledge/:id')
  updateKnowledge(@Param('id') id: string, @Body() dto: UpdateKnowledgeEntryDto) {
    return this.aiAdminService.updateKnowledgeEntry(id, dto);
  }

  @Patch('knowledge/:id/enabled')
  setKnowledgeEnabled(@Param('id') id: string, @Body() dto: UpdateKnowledgeEnabledDto) {
    return this.aiAdminService.setKnowledgeEnabled(id, dto.enabled);
  }
}
