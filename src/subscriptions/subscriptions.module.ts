import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Patient } from '../patients/entities/patient.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, Subscription, Patient])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [TypeOrmModule, SubscriptionsService],
})
export class SubscriptionsModule {}
