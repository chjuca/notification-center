import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notification } from './notification.entity.js';

export const DELIVERY_STATUSES = ['sent', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

@Entity({ name: 'notification_deliveries' })
@Index('idx_notification_deliveries_notification_id', ['notificationId'])
@Check(
  'chk_notification_deliveries_status',
  `"status" IN (${DELIVERY_STATUSES.map((status) => `'${status}'`).join(', ')})`,
)
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @Column({ type: 'varchar', length: 32 })
  channel: string;

  @Column({ type: 'varchar', length: 512 })
  recipient: string;

  @Column({ type: 'varchar', length: 16 })
  status: DeliveryStatus;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  details: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
