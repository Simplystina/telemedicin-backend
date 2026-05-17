import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabResult } from './entities/lab-result.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { LabResultsService } from './lab-results.service';
import { LabResultsController } from './lab-results.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LabResult, Doctor, Patient])],
  controllers: [LabResultsController],
  providers: [LabResultsService],
  exports: [TypeOrmModule, LabResultsService],
})
export class LabResultsModule {}
