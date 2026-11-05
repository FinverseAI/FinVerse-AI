import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  getHealth() {
    return {
      success: true,
      message: 'FinVerse Backend is running 🚀',
      timestamp: new Date().toISOString(),
    };
  }
}