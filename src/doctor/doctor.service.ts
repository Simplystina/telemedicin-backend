import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThan, Repository } from 'typeorm';
import { Doctor, DoctorStatus } from './entities/doctor.entity';
import { Specialty } from './entities/specialty.entity';
import { DoctorAvailability } from './entities/doctor-availability.entity';
import { User } from '../users/entities/user.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SaveAvailabilityDto } from './dto/save-availability.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterDoctorDto } from './dto/filter-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Specialty)
    private readonly specialtyRepository: Repository<Specialty>,
    @InjectRepository(DoctorAvailability)
    private readonly availabilityRepository: Repository<DoctorAvailability>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) { }

  async create(createDoctorDto: CreateDoctorDto, userId: number): Promise<Doctor> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (user.role !== 'doctor') {
      throw new BadRequestException('User must have role "doctor" to create a doctor profile');
    }

    // Check if doctor profile already exists for this user
    const existingDoctor = await this.doctorRepository.findOne({ where: { userId } });
    if (existingDoctor) {
      throw new BadRequestException('Doctor profile already exists for this user');
    }

    // Validate and find specialty if provided
    let specialty: Specialty | undefined;
    if (createDoctorDto.specialtyId) {
      specialty = (await this.specialtyRepository.findOne({ where: { id: createDoctorDto.specialtyId } })) ?? undefined;
      if (!specialty) {
        throw new NotFoundException(`Specialty with ID "${createDoctorDto.specialtyId}" not found`);
      }
    }

    const doctor = this.doctorRepository.create({
      ...createDoctorDto,
      user,
      specialty,
      status: DoctorStatus.PENDING, // Default to pending for admin approval
    });

    return this.doctorRepository.save(doctor);
  }

  async findAll(paginationDto: PaginationDto, filterDto: FilterDoctorDto): Promise<{ data: Doctor[]; meta: any }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.doctorRepository.createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.specialty', 'specialty')
      .skip(skip)
      .take(limit);

    // Apply filters
    if (filterDto.status) {
      queryBuilder.andWhere('doctor.status = :status', { status: filterDto.status });
    }

    if (filterDto.specialtyId) {
      queryBuilder.andWhere('doctor.specialtyId = :specialtyId', { specialtyId: filterDto.specialtyId });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        '(doctor.firstName ILIKE :search OR doctor.lastName ILIKE :search OR user.email ILIKE :search OR doctor.licenseNo ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { id },
      relations: ['user', 'specialty'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${id}" not found`);
    }

    return doctor;
  }

  async findByUserId(userId: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { userId },
      relations: ['user', 'specialty'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor profile not found for user with ID "${userId}"`);
    }

    return doctor;
  }

  async update(id: number, updateDoctorDto: UpdateDoctorDto, userId: number): Promise<Doctor> {
    const doctor = await this.findOne(id);

    // Authorization check: user can only update their own profile
    if (doctor.userId !== userId) {
      throw new BadRequestException('You can only update your own doctor profile');
    }

    // Validate and find specialty if provided
    if (updateDoctorDto.specialtyId) {
      const specialty = await this.specialtyRepository.findOne({ where: { id: updateDoctorDto.specialtyId } });
      if (!specialty) {
        throw new NotFoundException(`Specialty with ID "${updateDoctorDto.specialtyId}" not found`);
      }
      doctor.specialty = specialty;
    }

    // Update doctor name fields if provided
    if (updateDoctorDto.firstName) {
      doctor.firstName = updateDoctorDto.firstName;
    }
    if (updateDoctorDto.lastName) {
      doctor.lastName = updateDoctorDto.lastName;
    }

    // Update doctor fields
    Object.assign(doctor, updateDoctorDto);

    return this.doctorRepository.save(doctor);
  }

  async remove(id: number, userId: number): Promise<void> {
    const doctor = await this.findOne(id);

    // Authorization check: user can only delete their own profile
    if (doctor.userId !== userId) {
      throw new BadRequestException('You can only delete your own doctor profile');
    }

    // Soft delete the doctor profile
    await this.doctorRepository.softRemove(doctor);
  }

  async updateStatus(id: number, status: DoctorStatus, adminId: number): Promise<Doctor> {
    const doctor = await this.findOne(id);

    // Authorization check: only admins can update status
    const adminUser = await this.userRepository.findOne({ where: { id: adminId } });
    if (!adminUser || adminUser.role !== 'admin') {
      throw new BadRequestException('Only admins can update doctor status');
    }

    doctor.status = status;
    return this.doctorRepository.save(doctor);
  }

  async updateByUserId(userId: number, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.findByUserId(userId);
    if (dto.specialtyId) {
      const specialty = await this.specialtyRepository.findOne({ where: { id: dto.specialtyId } });
      if (!specialty) throw new NotFoundException(`Specialty with ID "${dto.specialtyId}" not found`);
      doctor.specialty = specialty;
    }
    Object.assign(doctor, dto);
    return this.doctorRepository.save(doctor);
  }

  // ─── Availability ─────────────────────────────────────────────────────────
  async getAvailability(doctorId: number, dateStr?: string): Promise<DoctorAvailability[]> {
    await this.findOne(doctorId);
    
    let query = this.availabilityRepository.createQueryBuilder('avail')
      .where('avail.doctorId = :doctorId', { doctorId })
      .andWhere('avail.isActive = true');

    if (dateStr) {
       const dateObj = new Date(dateStr);
       const dayOfWeek = dateObj.getDay();
       query = query.andWhere('avail.dayOfWeek = :dayOfWeek', { dayOfWeek });
    }

    const availabilities = await query.orderBy('avail.dayOfWeek', 'ASC').addOrderBy('avail.startTime', 'ASC').getMany();

    if (!dateStr) return availabilities;

    // Filter out taken slots for that specific date
    const appointments = await this.appointmentRepo.find({
       where: {
         doctorId,
         scheduledAt: Between(new Date(`${dateStr}T00:00:00`), new Date(`${dateStr}T23:59:59`)),
         status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
       }
    });

    if (appointments.length === 0) return availabilities;

    // Chop availability blocks to remove booked times
    let freeSlots: DoctorAvailability[] = [...availabilities];

    for (const appt of appointments) {
       const apptStartStr = appt.scheduledAt.toTimeString().slice(0, 5);
       const apptEnd = new Date(appt.scheduledAt.getTime() + appt.duration * 60000);
       const apptEndStr = apptEnd.toTimeString().slice(0, 5);

       const newFreeSlots: DoctorAvailability[] = [];
       for (const slot of freeSlots) {
          if (apptEndStr <= slot.startTime || apptStartStr >= slot.endTime) {
             newFreeSlots.push(slot); // No overlap
          } else {
             // Overlap: split into two (before and after the appointment)
             if (slot.startTime < apptStartStr) {
                newFreeSlots.push({ ...slot, endTime: apptStartStr } as DoctorAvailability);
             }
             if (slot.endTime > apptEndStr) {
                newFreeSlots.push({ ...slot, startTime: apptEndStr } as DoctorAvailability);
             }
          }
       }
       freeSlots = newFreeSlots;
    }

    return freeSlots;
  }

  async getMyAvailability(userId: number, dateStr?: string): Promise<DoctorAvailability[]> {
    const doctor = await this.findByUserId(userId);
    return this.getAvailability(doctor.id, dateStr);
  }

  async saveAvailability(doctorId: number, dto: SaveAvailabilityDto, userId: number): Promise<DoctorAvailability[]> {
    const doctor = await this.findOne(doctorId);
    if (doctor.userId !== userId) {
      throw new ForbiddenException('You can only update your own availability');
    }

    await this.availabilityRepository.delete({ doctorId });

    const slots = this.availabilityRepository.create(
      dto.slots.map(slot => ({ ...slot, doctorId })),
    );
    return this.availabilityRepository.save(slots);
  }

  async saveMyAvailability(userId: number, dto: SaveAvailabilityDto): Promise<DoctorAvailability[]> {
    const doctor = await this.findByUserId(userId);
    return this.saveAvailability(doctor.id, dto, userId);
  }

  async getDashboardStats(): Promise<any> {
    const totalDoctors = await this.doctorRepository.count();
    const verifiedDoctors = await this.doctorRepository.count({ where: { status: DoctorStatus.VERIFIED } });
    const pendingDoctors = await this.doctorRepository.count({ where: { status: DoctorStatus.PENDING } });
    const suspendedDoctors = await this.doctorRepository.count({ where: { status: DoctorStatus.SUSPENDED } });

    return { totalDoctors, verifiedDoctors, pendingDoctors, suspendedDoctors };
  }

  // ─── Doctor dashboard ─────────────────────────────────────────────────────
  async getMyDashboard(userId: number) {
    const doctor = await this.findByUserId(userId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaysAppointments, pendingConfirmations, completedThisMonth, uniquePatients] =
      await Promise.all([
        this.appointmentRepo.count({
          where: { doctorId: doctor.id, scheduledAt: Between(todayStart, todayEnd) },
        }),
        this.appointmentRepo.count({
          where: { doctorId: doctor.id, status: AppointmentStatus.PENDING },
        }),
        this.appointmentRepo.count({
          where: {
            doctorId: doctor.id,
            status: AppointmentStatus.COMPLETED,
            scheduledAt: MoreThan(monthStart),
          },
        }),
        this.appointmentRepo
          .createQueryBuilder('appt')
          .select('COUNT(DISTINCT appt.patientId)', 'count')
          .where('appt.doctorId = :doctorId', { doctorId: doctor.id })
          .getRawOne<{ count: string }>(),
      ]);

    const upcomingAppointments = await this.appointmentRepo
      .createQueryBuilder('appt')
      .where('appt.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('appt.scheduledAt > :now', { now })
      .andWhere('appt.status IN (:...statuses)', {
        statuses: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
      })
      .getCount();

    return {
      todaysAppointments,
      upcomingAppointments,
      pendingConfirmations,
      completedThisMonth,
      totalPatients: parseInt(uniquePatients?.count ?? '0', 10),
    };
  }

  // ─── Doctor's patient list ────────────────────────────────────────────────
  async getMyPatients(userId: number, page = 1, limit = 20) {
    const doctor = await this.findByUserId(userId);

    const rows = await this.appointmentRepo
      .createQueryBuilder('appt')
      .leftJoin('appt.patient', 'patient')
      .select('patient.id', 'id')
      .addSelect('patient.firstName', 'firstName')
      .addSelect('patient.lastName', 'lastName')
      .addSelect('MAX(appt.scheduledAt)', 'lastAppointment')
      .addSelect('COUNT(appt.id)', 'totalVisits')
      .where('appt.doctorId = :doctorId', { doctorId: doctor.id })
      .groupBy('patient.id')
      .addGroupBy('patient.firstName')
      .addGroupBy('patient.lastName')
      .orderBy('"lastAppointment"', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany<{ id: number; firstName: string; lastName: string; lastAppointment: string; totalVisits: string }>();

    const totalRow = await this.appointmentRepo
      .createQueryBuilder('appt')
      .select('COUNT(DISTINCT appt.patientId)', 'count')
      .where('appt.doctorId = :doctorId', { doctorId: doctor.id })
      .getRawOne<{ count: string }>();

    return {
      patients: rows.map(r => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        lastAppointment: r.lastAppointment,
        totalVisits: parseInt(r.totalVisits, 10),
      })),
      total: parseInt(totalRow?.count ?? '0', 10),
      page,
      limit,
    };
  }
}
