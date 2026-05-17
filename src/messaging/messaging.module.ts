import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Notification } from './entities/notification.entity';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { NotificationsController } from './notifications.controller';
import { MessagingGateway } from './messaging.gateway';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Notification, User, Doctor, Patient]),
    AuthModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [MessagingController, NotificationsController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
