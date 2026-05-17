import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BigIntTransformer } from '../../common/transformers/bigint-transformer';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint', transformer: new BigIntTransformer() })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Index({ unique: true })
  @Column()
  token!: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
