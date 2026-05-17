import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsInt, IsOptional, IsString, IsArray, ValidateNested, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { LabResult, LabResultStatus } from './entities/lab-result.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { UserRole } from '../users/entities/user.entity';

export class CreateLabResultDto {
  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsString()
  testName: string;

  @IsOptional()
  @IsString()
  recommendedHospital?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  dateDue?: Date;
}

class LabTestItemDto {
  @IsString()
  testName: string;

  @IsOptional()
  @IsString()
  recommendedHospital?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  dateDue?: Date;
}

export class BulkCreateLabResultDto {
  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabTestItemDto)
  tests: LabTestItemDto[];
}

export class UpdateLabResultDto {
  @IsOptional()
  @IsEnum(LabResultStatus)
  status?: LabResultStatus;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsDateString()
  resultDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class LabResultsService {
  constructor(
    @InjectRepository(LabResult)
    private readonly labResultRepo: Repository<LabResult>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async create(dto: CreateLabResultDto, userId: number): Promise<LabResult> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    if (!dto.patientId) throw new BadRequestException('patientId is required');

    const labResult = this.labResultRepo.create({
      doctorId: doctor.id,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      testName: dto.testName,
      status: LabResultStatus.REQUESTED,
      requestedAt: new Date(),
      recommendedHospital: dto.recommendedHospital,
      instructions: dto.instructions,
      dateDue: dto.dateDue,
    });
    return this.labResultRepo.save(labResult);
  }

  async createBulk(dto: BulkCreateLabResultDto, userId: number): Promise<LabResult[]> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    console.log(dto,"dti")
    if (!dto.patientId) throw new BadRequestException('patientId is required');

    const results = dto.tests.map(test => this.labResultRepo.create({
      doctorId: doctor.id,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      testName: test.testName,
      status: LabResultStatus.REQUESTED,
      requestedAt: new Date(),
      recommendedHospital: test.recommendedHospital,
      instructions: test.instructions,
      dateDue: test.dateDue,
    }));

    return this.labResultRepo.save(results);
  }

  async findAll(userId: number, role: string): Promise<LabResult[]> {
    if (role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId } });
      if (!doctor) return [];
      return this.labResultRepo.find({ where: { doctorId: doctor.id }, order: { requestedAt: 'DESC' } });
    }
    if (role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId } });
      if (!patient) return [];
      return this.labResultRepo.find({ where: { patientId: patient.id }, order: { requestedAt: 'DESC' } });
    }
    // admin
    return this.labResultRepo.find({ order: { requestedAt: 'DESC' } });
  }

  async findOne(id: number, userId: number, role: string): Promise<LabResult> {
    const result = await this.labResultRepo.findOne({ where: { id } });
    if (!result) throw new NotFoundException('Lab result not found');

    if (role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId } });
      if (doctor?.id !== result.doctorId) throw new ForbiddenException('Access denied');
    } else if (role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId } });
      if (patient?.id !== result.patientId) throw new ForbiddenException('Access denied');
    }
    return result;
  }

  async update(id: number, dto: UpdateLabResultDto, userId: number, role: string): Promise<LabResult> {
    const result = await this.findOne(id, userId, role);
    Object.assign(result, dto);
    return this.labResultRepo.save(result);
  }
}
