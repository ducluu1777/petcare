import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscountType, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public, Roles } from '../../common/decorators/auth.decorator.js';
import { VouchersService } from './vouchers.service.js';
import { UpdateVoucherDto } from './dto/update-voucher.dto.js';

class ValidateVoucherDto {
  @IsString() @IsNotEmpty() code: string;
  @IsInt() @Min(0) orderTotal: number;
}

class RedeemVoucherDto {
  @IsString() @IsNotEmpty() voucherCode: string;
}

class CreateVoucherDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(DiscountType) discountType: DiscountType;
  @IsInt() @Min(0) discountValue: number;
  @ValidateIf((dto: CreateVoucherDto) => dto.discountType === DiscountType.PERCENTAGE)
  @IsInt() @Min(0) maxDiscount?: number;
  @IsInt() @Min(0) minSpend: number;
  @IsInt() @Min(1) @IsOptional() pointCost?: number;
  @IsDateString() expiryDate: string;
  @IsInt() @IsOptional() usageLimit?: number;
  @IsIn([1, -1]) @IsOptional() usageLimitPerUser?: number;
}

@ApiTags('Vouchers (Mã giảm giá)')
@ApiBearerAuth()
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('rewards')
  @Public()
  @ApiOperation({ summary: 'Danh sách voucher có thể đổi bằng điểm tích luỹ' })
  async findRewards() {
    return this.vouchersService.findRewards();
  }

  @Get('me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Voucher khả dụng của tôi' })
  async findMine(@CurrentUser() user: User) {
    return this.vouchersService.findMyVouchers(user.id);
  }

  @Get('customer/:userId')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Voucher khả dụng của khách hàng để bán tại quầy' })
  async findForCustomer(@Param('userId') userId: string) {
    return this.vouchersService.findVouchersForCustomer(userId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Kiểm tra mã voucher + tính discount', description: 'Dùng trước khi checkout.' })
  async validate(@CurrentUser() user: User, @Body() dto: ValidateVoucherDto) {
    return this.vouchersService.validate(dto.code, user.id, dto.orderTotal);
  }

  @Post('redeem')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Đổi điểm lấy voucher' })
  async redeem(@CurrentUser() user: User, @Body() dto: RedeemVoucherDto) {
    return this.vouchersService.redeem(user.id, dto.voucherCode);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tất cả voucher (Admin & Staff)' })
  async findAll() {
    return this.vouchersService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo voucher (Admin & Staff)' })
  async create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật voucher (Admin & Staff)' })
  async update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }
}
