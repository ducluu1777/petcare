import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewTargetType, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/auth.decorator.js';
import { Public } from '../../common/decorators/auth.decorator.js';
import { ReviewsService } from './reviews.service.js';
import { ModerateReviewDto } from './dto/moderate-review.dto.js';

class CreateReviewDto {
  @IsEnum(ReviewTargetType) targetType: ReviewTargetType;
  @IsUUID() targetId: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @IsNotEmpty() comment: string;
}

@ApiTags('Reviews (Đánh giá)')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Gửi đánh giá', description: 'Chỉ sau khi lịch hẹn/đơn hàng đã COMPLETED.' })
  async create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Get('me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Danh sách đánh giá của tôi' })
  async findMine(@CurrentUser() user: User) {
    return this.reviewsService.findByAuthor(user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Danh sách đánh giá', description: '?targetType=SERVICE&targetId=...' })
  async findAll(
    @Query('targetType') targetType: ReviewTargetType,
    @Query('targetId') targetId: string,
  ) {
    return this.reviewsService.findAll(targetType, targetId);
  }

  @Get('admin')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách đánh giá để Admin/Staff kiểm duyệt' })
  async findAllForAdmin() {
    return this.reviewsService.findAllForAdmin();
  }

  @Patch(':id/moderation')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Ẩn hoặc hiện lại đánh giá; yêu cầu lý do và ghi Audit Log' })
  async moderate(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, user.id, dto);
  }
}
