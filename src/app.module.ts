import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientsModule } from './patients/patients.modules';
import { AppointmentsModule } from './appointments/appointments.module';
import { LabResultsModule } from './lab-results/lab-results.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { MessagingModule } from './messaging/messaging.module';
import { MailModule } from './mail/mail.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DoctorModule,
    PatientsModule,
    AppointmentsModule,
    LabResultsModule,
    SubscriptionsModule,
    PaymentsModule,
    MessagingModule,
    MailModule,
    SpecialtiesModule,
    AdminModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
