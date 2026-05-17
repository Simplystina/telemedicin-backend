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
import { User } from '../../users/entities/user.entity';

export enum PatientNoteType {
  SELF_REPORTED = 'self_reported',
  DOCTOR_NOTE = 'doctor_note',
}

@Entity('patient_notes')
export class PatientNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'int' })
  authorId: number; // Who wrote the note (patient or doctor)

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'enum', enum: PatientNoteType })
  type: PatientNoteType;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
