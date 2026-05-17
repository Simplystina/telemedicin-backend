import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageType } from './entities/message.entity';
import { Notification } from './entities/notification.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatAccessService } from '../chat/chat-access.service';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly chatAccessService: ChatAccessService,
  ) {}

  // ─── Messages ─────────────────────────────────────────────────────────────

  async send(dto: SendMessageDto, senderId: number, senderRole: string): Promise<Message> {
    // Resolve receiverId to a User ID (frontend may pass a profile ID instead)
    const receiverUserId = await this.resolveToUserId(dto.receiverId);

    await this.chatAccessService.assertCanSend(senderId, receiverUserId, senderRole);

    const message = this.messageRepo.create({
      senderId,
      receiverId: receiverUserId,
      appointmentId: dto.appointmentId,
      type: dto.type ?? MessageType.TEXT,
      content: dto.content,
      mediaUrl: dto.mediaUrl,
    });
    return this.messageRepo.save(message);
  }

  /**
   * Conversations — returns one entry per unique chat partner,
   * with the last message and unread count.
   */
  async getConversations(userId: number) {
    const rows = await this.messageRepo.manager.query(`
      WITH partners AS (
        SELECT DISTINCT ON (partner_id)
          CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
          m.content      AS last_content,
          m.type         AS last_type,
          m.created_at   AS last_message_at,
          m.sender_id    AS last_sender_id
        FROM messages m
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
          AND m.deleted_at IS NULL
        ORDER BY partner_id, m.created_at DESC
      ),
      unread AS (
        SELECT sender_id AS partner_id, COUNT(*)::int AS unread_count
        FROM messages
        WHERE receiver_id = $1 AND read_at IS NULL AND deleted_at IS NULL
        GROUP BY sender_id
      )
      SELECT
        p.partner_id                        AS "userId",
        p.last_content                      AS "lastMessage",
        p.last_type                         AS "lastMessageType",
        p.last_message_at                   AS "lastMessageAt",
        (p.last_sender_id = $1)             AS "isMine",
        COALESCE(u_unread.unread_count, 0)  AS "unreadCount",
        u.email,
        u.role,
        COALESCE(d.first_name, pt.first_name) AS "firstName",
        COALESCE(d.last_name,  pt.last_name)  AS "lastName"
      FROM partners p
      LEFT JOIN unread u_unread ON u_unread.partner_id = p.partner_id
      JOIN  users    u  ON u.id        = p.partner_id
      LEFT JOIN doctors  d  ON d.user_id  = p.partner_id
      LEFT JOIN patients pt ON pt.user_id = p.partner_id
      ORDER BY p.last_message_at DESC
    `, [userId]);

    return rows.map((row: any) => ({
      userId: Number(row.userId),
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      email: row.email,
      role: row.role,
      lastMessage: row.lastMessage ?? null,
      lastMessageType: row.lastMessageType,
      lastMessageAt: row.lastMessageAt,
      isMine: row.isMine,
      unreadCount: Number(row.unreadCount),
    }));
  }

  /**
   * History — returns the conversation thread between two users.
   * Also handles appointment-thread filtering when appointmentId is provided.
   */
  async getHistory(
    userId: number,
    otherId: number,
    appointmentId?: number,
  ): Promise<Message[]> {
    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .where(
        '(msg.senderId = :userId AND msg.receiverId = :otherId) OR (msg.senderId = :otherId AND msg.receiverId = :userId)',
        { userId, otherId },
      )
      .orderBy('msg.createdAt', 'ASC');

    if (appointmentId) {
      qb.andWhere('msg.appointmentId = :appointmentId', { appointmentId });
    }

    return qb.getMany();
  }

  async markRead(id: number, userId: number): Promise<Message> {
    const msg = await this.messageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.receiverId !== userId)
      throw new ForbiddenException('You can only mark your own messages as read');
    if (!msg.readAt) {
      msg.readAt = new Date();
      await this.messageRepo.save(msg);
    }
    return msg;
  }

  async markAllRead(receiverId: number): Promise<void> {
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('receiverId = :receiverId AND readAt IS NULL', { receiverId })
      .execute();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Accepts either a User ID or a Doctor/Patient profile ID and always
   * returns the correct User ID. This lets the frontend pass whichever
   * ID it has available without causing lookup failures.
   */
  private async resolveToUserId(id: number): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (user) return user.id;

    const doctor = await this.doctorRepo.findOne({ where: { id } });
    if (doctor) return doctor.userId;

    const patient = await this.patientRepo.findOne({ where: { id } });
    if (patient) return patient.userId;

    throw new NotFoundException('Recipient not found');
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async getNotifications(userId: number): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markNotificationRead(id: number, userId: number): Promise<Notification> {
    const notif = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (!notif.readAt) {
      notif.readAt = new Date();
      await this.notificationRepo.save(notif);
    }
    return notif;
  }

  async markAllNotificationsRead(userId: number): Promise<{ updated: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId AND readAt IS NULL', { userId })
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async createNotification(
    userId: number,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<Notification> {
    const notif = this.notificationRepo.create({ userId, type, title, body, data });
    return this.notificationRepo.save(notif);
  }
}
