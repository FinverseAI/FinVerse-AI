import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'FinVerse backend is running',
      timestamp: new Date().toISOString(),
    };
  }
}
