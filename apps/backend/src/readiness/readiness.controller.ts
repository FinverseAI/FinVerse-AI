import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { ReadinessService } from './readiness.service';

@Controller('api')
@UseGuards(SessionGuard)
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('readiness')
  @Header('Cache-Control', 'private, no-store')
  getReadiness(@Req() request: AuthenticatedRequest) {
    return this.readiness.assess(request.userId);
  }
}
