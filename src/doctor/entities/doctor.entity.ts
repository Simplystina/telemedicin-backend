import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';
import { User } from '../../users/entities/user.entity';
import { Specialty } from './specialty.entity';

export enum DoctorStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
}

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'int', nullable: true })
  specialtyId: number;

  @ManyToOne(() => Specialty, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'specialtyId' })
  specialty: Specialty;

  @Column({ nullable: true })
  hospital: string;

  @Column({ unique: true, nullable: true })
  licenseNo: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  yearsOfPractice?: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'enum', enum: DoctorStatus, default: DoctorStatus.PENDING })
  status: DoctorStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
