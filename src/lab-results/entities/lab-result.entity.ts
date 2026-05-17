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
import { Doctor } from '../../doctor/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

export enum LabResultStatus {
  REQUESTED = 'requested',
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('lab_results')
export class LabResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  doctorId: number; // Requesting doctor

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'int' })
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'int', nullable: true })
  appointmentId: number; // Nullable — can exist without a linked appointment

  @Column()
  testName: string;

  @Column({
    type: 'enum',
    enum: LabResultStatus,
    default: LabResultStatus.REQUESTED,
  })
  status: LabResultStatus;

  @Column({ nullable: true })
  filePath: string; // S3 URL — nullable until results uploaded

  @Column({ type: 'timestamp with time zone' })
  requestedAt: Date; // When the doctor ordered the test

  @Column({ type: 'timestamp with time zone', nullable: true })
  resultDate: Date; // When results came back

  @Column({ type: 'text', nullable: true })
  notes: string; // Doctor's interpretation of results

  @Column({ nullable: true })
  recommendedHospital: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ nullable: true })
  timeDue: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dateDue: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
