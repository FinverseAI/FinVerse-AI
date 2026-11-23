import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
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
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  chat(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ai.chat(request.userId, body);
  }

  @Post('explain-stock')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  explainStock(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ai.explainStock(request.userId, body);
  }

  @Post('explain-news')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  explainNews(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ai.explainNews(request.userId, body);
  }

  @Post('explain-readiness')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  explainReadiness(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.ai.explainReadiness(request.userId, body);
  }

  @Post('screen')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  screen(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ai.screenByQuery(request.userId, body);
  }
}
