import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g. 'Basic', 'Premium'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 3 })
  currency: string; // e.g. 'NGN'

  @Column({ type: 'int' })
  durationDays: number; // e.g. 30

  @Column({ type: 'jsonb', nullable: true })
  features: string[]; // Array of feature flags or perk descriptions

  @Column({ default: true })
  isActive: boolean; // Deactivate without deleting — preserves historical references

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
