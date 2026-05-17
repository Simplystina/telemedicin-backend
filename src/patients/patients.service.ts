import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async create(userId: number, firstName?: string, lastName?: string): Promise<Patient> {
    const patient = this.patientRepository.create({
      userId,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    });
    return this.patientRepository.save(patient);
  }

  async findByUserId(userId: number): Promise<Patient> {
    let patient = await this.patientRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!patient) {
      patient = await this.create(userId);
      patient = await this.patientRepository.findOne({
        where: { userId },
        relations: ['user'],
      });
    }

    return patient!;
  }

  async updateByUserId(userId: number, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.findByUserId(userId);
    Object.assign(patient, dto);
    return this.patientRepository.save(patient);
  }
}
