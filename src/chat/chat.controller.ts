import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat/sessions
   * Doctor opens a session with one of their patients.
   */
  @Roles(UserRole.DOCTOR)
  @Post('sessions')
  openSession(
    @Body() dto: CreateChatSessionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.openSession(user.id, dto);
  }

  /**
   * GET /chat/sessions
   * Doctor lists all their sessions (open and closed).
   */
  @Roles(UserRole.DOCTOR)
  @Get('sessions')
  listSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.listSessions(user.id);
  }

  /**
   * GET /chat/sessions/my-status?doctorUserId=
   * Patient checks whether a doctor has opened a session with them.
   * Call on chat page load to decide whether to lock or unlock the input.
   */
  @Roles(UserRole.PATIENT)
  @Get('sessions/my-status')
  getMyStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Query('doctorUserId', new ParseIntPipe({ optional: true })) doctorUserId?: number,
  ) {
    return this.chatService.getMyStatus(user.id, doctorUserId);
  }

  /**
   * GET /chat/sessions/:id
   * Get a single session — accessible by the doctor or patient in the session.
   */
  @Get('sessions/:id')
  getSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.getSession(id, user.id);
  }

  /**
   * PATCH /chat/sessions/:id/close
   * Doctor closes a session — patient becomes read-only after this.
   */
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @Patch('sessions/:id/close')
  closeSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.closeSession(id, user.id);
  }
}
