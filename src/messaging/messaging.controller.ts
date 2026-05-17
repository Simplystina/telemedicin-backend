import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /** GET /messages/conversations — inbox list with last message + unread count */
  @Get('conversations')
  conversations(@CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.getConversations(user.id);
  }

  /**
   * GET /messages?otherId=&appointmentId=
   * Loads conversation history between the caller and `otherId`.
   * Optionally scoped to a specific appointment thread.
   */
  @Get()
  history(
    @Query('otherId', ParseIntPipe) otherId: number,
    @Query('appointmentId', new ParseIntPipe({ optional: true })) appointmentId: number | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.getHistory(user.id, otherId, appointmentId);
  }

  /** PATCH /messages/:id/read — mark a single message as read */
  @HttpCode(HttpStatus.OK)
  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.markRead(id, user.id);
  }

  /** PATCH /messages/read-all — mark all unread messages as read */
  @HttpCode(HttpStatus.OK)
  @Patch('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.markAllRead(user.id);
  }
}
