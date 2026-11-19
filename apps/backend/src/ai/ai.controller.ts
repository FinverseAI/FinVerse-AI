import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { AiService } from './ai.service';

@Controller('api/ai')
@UseGuards(SessionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @Header('Cache-Control', 'private, no-store')
  status() {
    return this.ai.status();
  }

  @Post('chat')
  @Header('Cache-Control', 'private, no-store')
  chat(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ai.chat(request.userId, body);
  }

  @Post('explain-stock')
  @Header('Cache-Control', 'private, no-store')
  explainStock(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ai.explainStock(request.userId, body);
  }
}
