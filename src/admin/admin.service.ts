import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor, DoctorStatus } from '../doctor/entities/doctor.entity';
import { User } from '../users/entities/user.entity';
import { Specialty } from '../doctor/entities/specialty.entity';
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
