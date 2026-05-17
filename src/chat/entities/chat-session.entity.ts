import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';
import { Doctor } from '../../doctor/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ default: true })
  isOpen: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
