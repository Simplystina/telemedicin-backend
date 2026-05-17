import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';
import { Appointment } from './appointment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appointment_history')
export class AppointmentHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  appointmentId: number;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column()
  action: string; // e.g. 'RESCHEDULED', 'CANCELLED', 'CONFIRMED'

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  performedByUserId: number; // ID of the user (doctor, patient, or admin) who triggered this change

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'performedByUserId' })
  performedBy: User;

  @Column({ type: 'timestamp with time zone', nullable: true })
  oldTime: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  newTime: Date;

  @Column({ type: 'text', nullable: true })
  reason: string | null; // Optional explanation e.g. cancellation reason, reschedule note

  // Immutable audit log — no updatedAt or deletedAt
  @CreateDateColumn()
  createdAt: Date;
}
