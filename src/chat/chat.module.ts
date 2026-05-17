import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatAccessService } from './chat-access.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, Appointment, Doctor, Patient]),
    forwardRef(() => MessagingModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatAccessService],
  exports: [ChatAccessService],
})
export class ChatModule {}
