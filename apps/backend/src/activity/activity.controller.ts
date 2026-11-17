import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { ActivityService } from './activity.service';

@Controller('api')
@UseGuards(SessionGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('bills')
  @Header('Cache-Control', 'private, no-store')
  bills(@Req() request: AuthenticatedRequest) {
    return this.activity.bills(request.userId);
  }

  @Post('bills')
  @Header('Cache-Control', 'private, no-store')
  addBill(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.activity.addBill(request.userId, body);
  }

  @Delete('bills/:id')
  @Header('Cache-Control', 'private, no-store')
  removeBill(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.activity.removeBill(request.userId, id);
  }

  @Get('transactions')
  @Header('Cache-Control', 'private, no-store')
  transactions(@Req() request: AuthenticatedRequest) {
    return this.activity.transactions(request.userId);
  }

  @Post('transactions')
  @Header('Cache-Control', 'private, no-store')
  addTransaction(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.activity.addTransaction(request.userId, body);
  }

  @Put('transactions/:id')
  @Header('Cache-Control', 'private, no-store')
  updateTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.activity.updateTransaction(request.userId, id, body);
  }

  @Delete('transactions/:id')
  @Header('Cache-Control', 'private, no-store')
  removeTransaction(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.activity.removeTransaction(request.userId, id);
  }
}
