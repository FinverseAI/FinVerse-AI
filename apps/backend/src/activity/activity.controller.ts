import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
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
  addBill(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    // B44: a client-generated unique key per request; a replay within
    // 24h is rejected with 409 DUPLICATE_REQUEST.
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.activity.addBill(request.userId, body, idempotencyKey);
  }

  // B48: an auto-pay run records payments but creates no resource of
  // its own (and often records nothing), so it returns 200; 201 is
  // reserved for creates.
  @Post('bills/auto-pay')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  runAutoPay(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.activity.runAutoPay(request.userId, body);
  }

  @Put('bills/:id')
  @Header('Cache-Control', 'private, no-store')
  updateBill(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.activity.updateBill(request.userId, id, body);
  }

  @Delete('bills/:id')
  @Header('Cache-Control', 'private, no-store')
  removeBill(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.activity.removeBill(request.userId, id);
  }

  @Get('bills/:id/payments')
  @Header('Cache-Control', 'private, no-store')
  billPayments(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.activity.billPayments(request.userId, id);
  }

  @Post('bills/:id/payments')
  @Header('Cache-Control', 'private, no-store')
  addBillPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.activity.addBillPayment(
      request.userId,
      id,
      body,
      idempotencyKey,
    );
  }

  @Delete('bills/:id/payments/:paymentId')
  @Header('Cache-Control', 'private, no-store')
  removeBillPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.activity.removeBillPayment(request.userId, id, paymentId);
  }

  @Get('goals/:id/contributions')
  @Header('Cache-Control', 'private, no-store')
  goalContributions(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.activity.goalContributions(request.userId, id);
  }

  @Post('goals/:id/contributions')
  @Header('Cache-Control', 'private, no-store')
  addGoalContribution(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.activity.addGoalContribution(
      request.userId,
      id,
      body,
      idempotencyKey,
    );
  }

  @Delete('goals/:id/contributions/:contributionId')
  @Header('Cache-Control', 'private, no-store')
  removeGoalContribution(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.activity.removeGoalContribution(
      request.userId,
      id,
      contributionId,
    );
  }

  @Get('transactions')
  @Header('Cache-Control', 'private, no-store')
  transactions(@Req() request: AuthenticatedRequest) {
    return this.activity.transactions(request.userId);
  }

  @Post('transactions')
  @Header('Cache-Control', 'private, no-store')
  addTransaction(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.activity.addTransaction(request.userId, body, idempotencyKey);
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
