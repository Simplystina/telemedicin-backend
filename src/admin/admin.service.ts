import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Doctor, DoctorStatus } from '../doctor/entities/doctor.entity';
import { User } from '../users/entities/user.entity';
import { Specialty } from '../doctor/entities/specialty.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { FilterDoctorDto } from '../doctor/dto/filter-doctor.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Specialty)
    private readonly specialtyRepo: Repository<Specialty>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}


  // ── Doctors ───────────────────────────────────────────────────────────────

  async getAllDoctors(
    paginationDto: PaginationDto,
    filterDto: FilterDoctorDto,
  ): Promise<{ data: Doctor[]; meta: any }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const qb = this.doctorRepo
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.specialty', 'specialty')
      .skip(skip)
      .take(limit)
      .orderBy('doctor.createdAt', 'DESC');

    if (filterDto.status) {
      qb.andWhere('doctor.status = :status', { status: filterDto.status });
    }
    if (filterDto.specialtyId) {
      qb.andWhere('doctor.specialtyId = :specialtyId', {
        specialtyId: filterDto.specialtyId,
      });
    }
    if (filterDto.search) {
      qb.andWhere(
        '(doctor.firstName ILIKE :search OR doctor.lastName ILIKE :search OR user.email ILIKE :search OR doctor.licenseNo ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDoctor(id: number): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({
      where: { id },
      relations: ['user', 'specialty'],
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${id}" not found`);
    }
    return doctor;
  }

  async updateDoctorStatus(id: number, status: DoctorStatus): Promise<Doctor> {
    const doctor = await this.getDoctor(id);
    doctor.status = status;
    return this.doctorRepo.save(doctor);
  }

  // ── Patients ──────────────────────────────────────────────────────────────

  async getAllPatients(pagination: PaginationDto, search?: string) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.patientRepo
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.user', 'user')
      .skip(skip)
      .take(limit)
      .orderBy('patient.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(patient.firstName ILIKE :search OR patient.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPatient(id: number) {
    const patient = await this.patientRepo.findOne({ where: { id }, relations: ['user'] });
    if (!patient) throw new NotFoundException(`Patient with ID "${id}" not found`);
    return patient;
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  async getAllAppointments(
    pagination: PaginationDto,
    filters: { status?: AppointmentStatus; from?: string; to?: string },
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.appointmentRepo
      .createQueryBuilder('appt')
      .leftJoinAndSelect('appt.doctor', 'doctor')
      .leftJoinAndSelect('doctor.specialty', 'specialty')
      .leftJoinAndSelect('appt.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .skip(skip)
      .take(limit)
      .orderBy('appt.scheduledAt', 'DESC');

    if (filters.status) {
      qb.andWhere('appt.status = :status', { status: filters.status });
    }
    if (filters.from && filters.to) {
      qb.andWhere('appt.scheduledAt BETWEEN :from AND :to', {
        from: new Date(filters.from),
        to: new Date(filters.to),
      });
    } else if (filters.from) {
      qb.andWhere('appt.scheduledAt >= :from', { from: new Date(filters.from) });
    } else if (filters.to) {
      qb.andWhere('appt.scheduledAt <= :to', { to: new Date(filters.to) });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAppointment(id: number) {
    const appt = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'doctor.specialty', 'doctor.user', 'patient', 'patient.user'],
    });
    if (!appt) throw new NotFoundException(`Appointment with ID "${id}" not found`);
    return appt;
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async setUserActive(userId: number, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID "${userId}" not found`);
    user.isActive = isActive;
    await this.userRepo.save(user);
    return {
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      userId: user.id,
      isActive: user.isActive,
    };
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<{
    doctors: {
      total: number;
      verified: number;
      pending: number;
      suspended: number;
    };
    users: { total: number };
    specialties: { total: number };
  }> {
    const [
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      suspendedDoctors,
      totalUsers,
      totalSpecialties,
    ] = await Promise.all([
      this.doctorRepo.count(),
      this.doctorRepo.count({ where: { status: DoctorStatus.VERIFIED } }),
      this.doctorRepo.count({ where: { status: DoctorStatus.PENDING } }),
      this.doctorRepo.count({ where: { status: DoctorStatus.SUSPENDED } }),
      this.userRepo.count(),
      this.specialtyRepo.count(),
    ]);

    return {
      doctors: { total: totalDoctors, verified: verifiedDoctors, pending: pendingDoctors, suspended: suspendedDoctors },
      users: { total: totalUsers },
      specialties: { total: totalSpecialties },
    };
  }
}
