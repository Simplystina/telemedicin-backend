import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PaymentableType {
  SUBSCRIPTION = 'subscription',
  APPOINTMENT = 'appointment',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  paymentableId: number; // Polymorphic FK — ID of subscription or appointment

  @Column({ type: 'enum', enum: PaymentableType })
  paymentableType: PaymentableType; // Discriminator for the polymorphic FK

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string; // e.g. 'NGN', 'USD'

  @Column()
  provider: string; // e.g. 'Paystack', 'Flutterwave'

  @Index({ unique: true })
  @Column({ unique: true })
  reference: string; // Unique provider transaction reference

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  refundedAt: Date;

  @Column({ type: 'text', nullable: true })
  refundReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
