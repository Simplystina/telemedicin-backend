import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity('doctor_reviews')
@Unique(['patientId', 'appointmentId']) // One review per visit
export class DoctorReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'int' })
  patientId: number;
  // FK to patients resolved at app level to avoid circular dep at entity level

  @Column({ type: 'int' })
  appointmentId: number;
  // FK to appointments resolved at app level

  @Column({ type: 'int' })
  rating: number; // 1–5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
