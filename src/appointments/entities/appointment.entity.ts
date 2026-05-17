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
import { Doctor } from '../../doctor/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

export enum AppointmentMode {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
  IN_PERSON = 'in_person',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
  EXPIRED = 'expired',
}

export enum NoShowBy {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
  BOTH = 'both',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  doctorId!: number;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId' })
  doctor!: Doctor;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  patientId!: number;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt!: Date;

  @Column({ type: 'int' })
  duration!: number;

  @Column({ type: 'enum', enum: AppointmentMode })
  mode!: AppointmentMode;



  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status!: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ type: 'enum', enum: NoShowBy, nullable: true })
  noShowBy!: NoShowBy | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date;
}
