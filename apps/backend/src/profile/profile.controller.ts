import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { ProfileService } from './profile.service';

@Controller('api')
@UseGuards(SessionGuard)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('profile')
  @Header('Cache-Control', 'private, no-store')
  get(@Req() request: AuthenticatedRequest) {
    return this.profiles.get(request.userId);
  }

  @Post('onboarding')
  @Header('Cache-Control', 'private, no-store')
  onboard(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.profiles.save(request.userId, body, true);
  }

  @Put('profile')
  @Header('Cache-Control', 'private, no-store')
  update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.profiles.save(request.userId, body, false);
  }
}
