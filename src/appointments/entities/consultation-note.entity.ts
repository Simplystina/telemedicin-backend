import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';
import { Appointment } from './appointment.entity';
import { Doctor } from '../../doctor/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('consultation_notes')
export class ConsultationNote {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', unique: true, transformer: new BigIntTransformer() })
  appointmentId: number; // 1:1 per appointment

  @OneToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'text', nullable: true })
  clinicalNote: string; // Extensive, doctor-only internal notes (e.g., SOAP format)

  @Column({ type: 'text', nullable: true })
  diagnosis: string; // Doctor's diagnosis

  @Column({ type: 'text', nullable: true })
  treatmentPlan: string;

  @Column({ type: 'date', nullable: true })
  followUpDate: string;

  @Column({ type: 'text', nullable: true })
  patientNotes: string;

  @Column({ default: false })
  isSharedWithPatient: boolean; // Controls whether the patientNote is visible to the patient yet

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
