import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './entities/doctor.entity';
import { Specialty } from './entities/specialty.entity';
import { DoctorAvailability } from './entities/doctor-availability.entity';
import { DoctorAvailabilityOverride } from './entities/doctor-availability-override.entity';
import { DoctorDocument } from './entities/doctor-document.entity';
import { DoctorReview } from './entities/doctor-review.entity';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      Specialty,
      DoctorAvailability,
      DoctorAvailabilityOverride,
      DoctorDocument,
      DoctorReview,
      User,
      Appointment,
      Patient,
    ]),
  ],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [TypeOrmModule, DoctorService],
})
export class DoctorModule {}
