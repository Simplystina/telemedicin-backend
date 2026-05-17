import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly configService: ConfigService,
  ) {}

  // ─── Initialize payment ───────────────────────────────────────────────────
  async initialize(dto: InitializePaymentDto, userId: number) {
    const reference = `TM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const payment = this.paymentRepo.create({
      userId,
      paymentableId: dto.paymentableId,
      paymentableType: dto.paymentableType,
      amount: dto.amount,
      currency: dto.currency,
      provider: 'Paystack',
      reference,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(payment);

    // In production, call Paystack's /transaction/initialize here and return authorization_url.
    return {
      reference,
      paymentId: payment.id,
      message: 'Payment initialized. Redirect user to the Paystack checkout URL.',
      // authorizationUrl: paystackResponse.authorization_url
    };
  }

  // ─── List payments (user-scoped) ──────────────────────────────────────────
  async findAll(userId: number) {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Get one ──────────────────────────────────────────────────────────────
  async findOne(id: number, userId: number) {
    const payment = await this.paymentRepo.findOne({ where: { id, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // ─── Paystack webhook ─────────────────────────────────────────────────────
  /**
   * Authenticates the Paystack webhook using HMAC-SHA512 of the raw request
   * body with the secret key. Route must receive the raw body (Buffer) —
   * see main.ts rawBody configuration.
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
    const expected = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expected) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let event: { event: string; data: any };
    try {
      event = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    this.logger.log(`Paystack webhook: ${event.event}`);

    switch (event.event) {
      case 'charge.success':
        await this.markSuccess(event.data.reference);
        break;
      case 'charge.failed':
        await this.markFailed(event.data.reference);
        break;
      case 'refund.processed':
        await this.markRefunded(event.data.reference, event.data.reason);
        break;
      default:
        this.logger.log(`Unhandled Paystack event: ${event.event}`);
    }
  }

  // ─── Internals ────────────────────────────────────────────────────────────
  private async markSuccess(reference: string) {
    await this.paymentRepo.update({ reference }, { status: PaymentStatus.SUCCESS });
  }

  private async markFailed(reference: string) {
    await this.paymentRepo.update({ reference }, { status: PaymentStatus.FAILED });
  }

  private async markRefunded(reference: string, reason: string) {
    await this.paymentRepo.update(
      { reference },
      { status: PaymentStatus.REFUNDED, refundedAt: new Date(), refundReason: reason },
    );
  }
}
