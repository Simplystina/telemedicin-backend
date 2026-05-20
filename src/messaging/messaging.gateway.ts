import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

/**QN
[]\
[[[]]] * WebSocket gateway for real-time messaging.
 * Works alongside the REST endpoint:
 *  - REST  → persist messages, load history, mark read
 *  - WS    → real-time broadcast of new messages to connected receivers
 *
 * Authentication: client sends JWT in socket handshake auth header:
 *   io(url, { auth: { token: '<accessToken>' } })
 */
@WebSocketGateway({
  cors: { origin: '*' },      // tighten this in production
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagingService: MessagingService,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new WsException('Missing auth token');

      const payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(token);
      // Attach user to socket data for downstream use
      client.data.user = { id: payload.sub, email: payload.email, role: payload.role };

      // Each authenticated user joins a private room identified by their userId
      await client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Rejected unauthenticated socket: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  /**
   * Event: sendMessage
   * Client emits this with a SendMessageDto payload.
   * The message is persisted via MessagingService and then broadcast to
   * the receiver's private room (user:<receiverId>).
   */
  @SubscribeMessage('sendMessage')
  async onSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthenticated');

    const message = await this.messagingService.send(dto, Number(user.id), user.role);

    // Emit to both sender and receiver so both chat boxes update instantly
    this.server
      .to(`user:${message.receiverId}`)
      .to(`user:${message.senderId}`)
      .emit('newMessage', message);

    return message;
  }

  /**
   * Event: markRead
   * Client emits when the recipient opens a message.
   * Notifies the sender that their message was read.
   */
  @SubscribeMessage('markRead')
  async onMarkRead(
    @MessageBody() data: { messageId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthenticated');

    const message = await this.messagingService.markRead(data.messageId, user.id);

    // Notify the original sender that the message was read
    this.server.to(`user:${message.senderId}`).emit('messageRead', {
      messageId: message.id,
      readAt: message.readAt,
    });

    return message;
  }

  // ─── Session events (emitted by ChatService) ──────────────────────────────

  emitSessionOpened(patientUserId: number) {
    this.server.to(`user:${patientUserId}`).emit('sessionOpened');
  }

  emitSessionClosed(patientUserId: number) {
    this.server.to(`user:${patientUserId}`).emit('sessionClosed');
  }

  /**
   * Event: typing
   * Lightweight typing indicator — not persisted.
   */
  @SubscribeMessage('typing')
  onTyping(
    @MessageBody() data: { receiverId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;
    this.server.to(`user:${data.receiverId}`).emit('userTyping', {
      senderId: user.id,
    });
  }
}
