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
import { Patient } from './patient.entity';

@Entity('patient_medical_history')
export class PatientMedicalHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'uuid', nullable: true })
  appointmentId: string; // Nullable — pre-existing conditions may have no linked appointment

  @Column()
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  noteOnDiagnoses: string;

  @Column({ type: 'date' })
  diagnosedAt: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
