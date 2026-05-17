import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentHistory } from './entities/appointment-history.entity';
import { ConsultationSession } from './entities/consultation-session.entity';
import { ConsultationNote } from './entities/consultation-note.entity';
import { Prescription } from './entities/prescription.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentSweepService } from './appointment-sweep.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentHistory,
      ConsultationSession,
      ConsultationNote,
      Prescription,
      Doctor,
      Patient,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentSweepService],
  exports: [TypeOrmModule, AppointmentsService],
})
export class AppointmentsModule {}
