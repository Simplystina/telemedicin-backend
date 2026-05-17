import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';

export enum OverrideType {
  UNAVAILABLE = 'unavailable',
  EXTRA_AVAILABLE = 'extra_available',
}

@Entity('doctor_availability_overrides')
export class DoctorAvailabilityOverride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'date' })
  date: string; // Specific calendar date

  @Column({ type: 'enum', enum: OverrideType })
  type: OverrideType;

  @Column({ type: 'time', nullable: true })
  startTime: string; // Only relevant for 'extra_available'

  @Column({ type: 'time', nullable: true })
  endTime: string; // Only relevant for 'extra_available'

  @Column({ nullable: true })
  reason: string; // e.g. 'Public holiday', 'Conference'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
