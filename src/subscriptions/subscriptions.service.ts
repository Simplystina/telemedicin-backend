import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Patient } from '../patients/entities/patient.entity';

export class CreatePlanDto {
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  features?: string[];
}

export class SubscribeDto {
  planId: number;
  autoRenew?: boolean;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  // ─── Plans ────────────────────────────────────────────────────────────────
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({ where: { isActive: true } });
  }

  async createPlan(dto: CreatePlanDto): Promise<SubscriptionPlan> {
    const plan = this.planRepo.create({ ...dto, isActive: true });
    return this.planRepo.save(plan);
  }

  async updatePlan(id: number, dto: Partial<CreatePlanDto>): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async deactivatePlan(id: number): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    plan.isActive = false;
    return this.planRepo.save(plan);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────
  async subscribe(dto: SubscribeDto, userId: number): Promise<Subscription> {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const plan = await this.planRepo.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    // Check for existing active subscription
    const existing = await this.subscriptionRepo.findOne({
      where: { patientId: patient.id, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) throw new BadRequestException('You already have an active subscription');

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    const subscription = this.subscriptionRepo.create({
      patientId: patient.id,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      startedAt,
      expiresAt,
      autoRenew: dto.autoRenew ?? false,
    });
    return this.subscriptionRepo.save(subscription);
  }

  async getMySubscription(userId: number): Promise<Subscription | null> {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) return null;
    return this.subscriptionRepo.findOne({
      where: { patientId: patient.id },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(userId: number): Promise<Subscription> {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');
    const sub = await this.subscriptionRepo.findOne({
      where: { patientId: patient.id, status: SubscriptionStatus.ACTIVE },
    });
    if (!sub) throw new NotFoundException('No active subscription found');
    sub.status = SubscriptionStatus.CANCELED;
    sub.autoRenew = false;
    return this.subscriptionRepo.save(sub);
  }
}
