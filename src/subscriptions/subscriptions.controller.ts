import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  SubscriptionsService,
  CreatePlanDto,
  SubscribeDto,
} from './subscriptions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** GET /subscriptions/plans — public plan listing */
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  /** POST /subscriptions/plans — admin creates a plan */
  @Roles(UserRole.ADMIN)
  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  /** PATCH /subscriptions/plans/:id — admin updates a plan */
  @Roles(UserRole.ADMIN)
  @Patch('plans/:id')
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePlanDto>,
  ) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  /** DELETE /subscriptions/plans/:id — admin deactivates a plan */
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete('plans/:id')
  deactivatePlan(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.deactivatePlan(id);
  }

  /** POST /subscriptions/subscribe — patient subscribes to a plan */
  @Roles(UserRole.PATIENT)
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.subscriptionsService.subscribe(dto, user.id);
  }

  /** GET /subscriptions/me — patient fetches their current subscription */
  @Roles(UserRole.PATIENT)
  @Get('me')
  getMySubscription(@CurrentUser() user: CurrentUserPayload) {
    return this.subscriptionsService.getMySubscription(user.id);
  }

  /** POST /subscriptions/cancel */
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @Post('cancel')
  cancel(@CurrentUser() user: CurrentUserPayload) {
    return this.subscriptionsService.cancel(user.id);
  }
}
