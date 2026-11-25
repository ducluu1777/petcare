import { Body, Controller, Get, Headers, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiAssistantService } from './ai-assistant.service.js';
import { Public, Roles } from '../../common/decorators/auth.decorator.js';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PetsService } from '../pets/pets.service.js';
import { requireIdempotencyKey } from '../../common/idempotency.js';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export class ChatHistoryDto {
  @IsString()
  @IsIn(['user', 'model'])
  role: 'user' | 'model';
  
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(2000)
  message: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryDto)
  @IsOptional()
  history?: ChatHistoryDto[];
}

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
export class AiAssistantController {
  constructor(
    private readonly aiService: AiAssistantService,
    private readonly petsService: PetsService,
  ) {}

  @Post('chat')
  @Public() // Allow public access, but can use token for personalized context
  @ApiOperation({ summary: 'Chat với trợ lý AI', description: 'Gửi tin nhắn và lịch sử trò chuyện. Tự động parse context nếu có đăng nhập.' })
  async chat(
    @Body() dto: ChatDto,
    @CurrentUser() user?: User,
    @Headers('idempotency-key') requestKey?: string,
  ) {
    return this.aiService.chat(dto.message, dto.history ?? [], user?.id, requireIdempotencyKey(requestKey));
  }

  @Post('chat/stream')
  @Public()
  @ApiOperation({
    summary: 'Chat streaming với trợ lý AI (SSE)',
    description: 'Server-Sent Events streaming phản hồi của AI từng token. Hỗ trợ tự động fallback khi offline LLM.',
  })
  async chatStream(
    @Body() dto: ChatDto,
    @Res() res: Response,
    @CurrentUser() user?: User,
    @Headers('idempotency-key') requestKey?: string,
  ) {
    const idempotencyKey = requireIdempotencyKey(requestKey);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let isClosed = false;
    res.on('close', () => {
      isClosed = true;
    });

    try {
      await this.aiService.chatStream(
        dto.message,
        dto.history ?? [],
        user?.id,
        (chunk: string) => {
          if (!isClosed) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        },
        (metadata) => {
          if (!isClosed) res.write(`data: ${JSON.stringify(metadata)}\n\n`);
        },
        idempotencyKey,
      );
      if (!isClosed) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (err: any) {
      if (!isClosed) {
        res.write(`data: ${JSON.stringify({ error: err?.message || 'Lỗi xử lý luồng AI' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  }

  @Get('context/me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Lấy context cho AI (Thú cưng của tôi)' })
  async getContext(@CurrentUser() user: User) {
    return this.petsService.findAllByUser(user.id);
  }
}
