import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { RagService } from './rag.service';

@Controller('api/rag')
@UseGuards(SessionGuard)
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Get('news/:symbol')
  @Header('Cache-Control', 'private, no-store')
  news(@Param('symbol') symbol: string) {
    return this.rag.newsForSymbol(symbol);
  }

  @Post('screen')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  screen(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.rag.screen(request.userId, body);
  }
}
