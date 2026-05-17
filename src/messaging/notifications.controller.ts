import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly messagingService: MessagingService) {}

  /** GET /notifications — list all for the authenticated user */
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.getNotifications(user.id);
  }

  /** PATCH /notifications/:id/read — mark single notification read */
  @HttpCode(HttpStatus.OK)
  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.markNotificationRead(id, user.id);
  }

  /** POST /notifications/read-all — bulk mark all notifications read */
  @HttpCode(HttpStatus.OK)
  @Post('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.markAllNotificationsRead(user.id);
  }
}
