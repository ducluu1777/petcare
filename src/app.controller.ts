import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/auth.decorator.js';

@ApiTags('Root & System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Kiểm tra trạng thái dịch vụ (Root)' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra tình trạng kết nối DB & Hệ thống' })
  async getHealth() {
    return this.appService.getHealth();
  }
}
