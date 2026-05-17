import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { PatientMedicalHistory } from './entities/patient-medical-history.entity';
import { PatientNote } from './entities/patient-note.entity';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, PatientMedicalHistory, PatientNote]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [TypeOrmModule, PatientsService],
})
export class PatientsModule {}
