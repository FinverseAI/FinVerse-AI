import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'FinVerse API',
      status: 'ok',
      health: '/api/health',
    };
  }

  @Get('api/health')
  getHealth() {
    return {
      success: true,
      message: 'FinVerse Backend is running 🚀',
      timestamp: new Date().toISOString(),
    };
  }
}
