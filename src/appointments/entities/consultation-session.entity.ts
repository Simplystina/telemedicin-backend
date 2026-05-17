import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';
import { Appointment } from './appointment.entity';

@Entity('consultation_sessions')
export class ConsultationSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint', unique: true, transformer: new BigIntTransformer() })
  appointmentId!: number;

  @OneToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment!: Appointment;

  @Column()
  provider!: string;

  @Column()
  roomUrl!: string;

  @Column({ type: 'text', nullable: true })
  roomToken!: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  doctorJoinedAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  patientJoinedAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt!: Date;

  @Column({ type: 'int', nullable: true })
  durationSeconds!: number;

  @Column({ nullable: true })
  recordingUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
