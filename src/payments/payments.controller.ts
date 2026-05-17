import * as common from '@nestjs/common';
import * as express from 'express';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@common.Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  /** POST /payments/initialize — start a payment for subscription or appointment */
  @common.Post('initialize')
  initialize(
    @common.Body() dto: InitializePaymentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.paymentsService.initialize(dto, user.id);
  }

  /** GET /payments — list the authenticated user's payments */
  @common.Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.findAll(user.id);
  }

  /** GET /payments/:id */
  @common.Get(':id')
  findOne(
    @common.Param('id', common.ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.paymentsService.findOne(id, user.id);
  }

  /**
   * POST /payments/webhook — PUBLIC (no JWT)
   * Paystack calls this directly. Authenticity verified via HMAC-SHA512
   * of the raw request body with PAYSTACK_SECRET_KEY (x-paystack-signature header).
   * Raw body is preserved by the rawBody: true option in NestFactory.create().
   */
  @Public()
  @common.HttpCode(common.HttpStatus.OK)
  @common.Post('webhook')
  webhook(
    @common.Headers('x-paystack-signature') signature: string,
    @common.Req() req: common.RawBodyRequest<express.Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody!);
  }
}
