import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';
import { User } from '../../users/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  senderId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  receiverId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column({ type: 'bigint', nullable: true, transformer: new BigIntTransformer() })
  appointmentId: number; // Optional — threads message to a consultation

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string; // Text body — nullable for non-text message types

  @Column({ nullable: true })
  mediaUrl: string; // S3 URL for file, image, or audio messages

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date; // Null = unread; set when recipient opens

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
