import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import {
  Appointment,
  AppointmentMode,
  AppointmentStatus,
} from './entities/appointment.entity';
import { AppointmentHistory } from './entities/appointment-history.entity';
import { ConsultationSession } from './entities/consultation-session.entity';
import { ConsultationNote } from './entities/consultation-note.entity';
import { CreateAppointmentDto, AppointmentType } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { UpsertConsultationNoteDto } from './dto/upsert-consultation-note.dto';
import { Prescription } from './entities/prescription.entity';
import { UserRole } from '../users/entities/user.entity';
import { Doctor, DoctorStatus } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';

// Maps frontend type string to DB enum value
const TYPE_TO_MODE: Record<AppointmentType, AppointmentMode> = {
  [AppointmentType.VIDEO]: AppointmentMode.VIDEO,
  [AppointmentType.IN_PERSON]: AppointmentMode.IN_PERSON,
  [AppointmentType.AUDIO]: AppointmentMode.AUDIO,
  [AppointmentType.CHAT]: AppointmentMode.CHAT,
};

// Maps DB enum value back to frontend type string
const MODE_TO_TYPE: Record<AppointmentMode, string> = {
  [AppointmentMode.VIDEO]: 'video',
  [AppointmentMode.IN_PERSON]: 'in-person',
  [AppointmentMode.AUDIO]: 'audio',
  [AppointmentMode.CHAT]: 'chat',
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(AppointmentHistory)
    private readonly historyRepo: Repository<AppointmentHistory>,
    @InjectRepository(ConsultationSession)
    private readonly sessionRepo: Repository<ConsultationSession>,
    @InjectRepository(ConsultationNote)
    private readonly noteRepo: Repository<ConsultationNote>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
  ) { }

  // ─── Book appointment ─────────────────────────────────────────────────────
  async create(dto: CreateAppointmentDto, userId: number) {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const scheduledAt = new Date(`${dto.date}T${dto.startTime}:00`);
    const duration = this.parseDuration(dto.startTime, dto.endTime);

    // Patient restriction: Can only have one active appointment at a time
    const activePatientAppt = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
      },
    });

    if (activePatientAppt) {
      throw new BadRequestException('You already have an active appointment. Please complete or cancel it before booking a new one.');
    }

    // Double-booking protection
    const existing = await this.appointmentRepo.findOne({
      where: {
        doctorId: doctor.id,
        scheduledAt,
        status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
      },
    });

    if (existing) {
      throw new ConflictException('This time slot is no longer available.');
    }

    const appointment = this.appointmentRepo.create({
      doctorId: doctor.id,
      patientId: patient.id,
      scheduledAt,
      duration,
      mode: TYPE_TO_MODE[dto.type],
      notes: dto.reason ?? null,
      status: AppointmentStatus.PENDING,
    });

    const saved = await this.appointmentRepo.save(appointment);
    await this.recordHistory(saved.id, 'BOOKED', userId);

    const full = await this.appointmentRepo.findOne({
      where: { id: saved.id },
      relations: ['doctor', 'doctor.specialty', 'patient'],
    });

    return this.format(full!);
  }

  // ─── List appointments ────────────────────────────────────────────────────
  async findAll(userId: number, role: string, query: ListAppointmentsQueryDto) {
    const { status, from, to, page = 1, limit = 20 } = query;

    const qb = this.appointmentRepo
      .createQueryBuilder('appt')
      .leftJoinAndSelect('appt.doctor', 'doctor')
      .leftJoinAndSelect('doctor.specialty', 'specialty')
      .leftJoinAndSelect('appt.patient', 'patient')
      .orderBy('appt.scheduledAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId } });
      if (!patient) return { appointments: [], total: 0, page, limit };
      qb.where('appt.patientId = :id', { id: patient.id });
    } else if (role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId } });
      if (!doctor) return { appointments: [], total: 0, page, limit };
      qb.where('appt.doctorId = :id', { id: doctor.id });
    }

    if (status) qb.andWhere('appt.status = :status', { status });
    if (from) qb.andWhere('appt.scheduledAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('appt.scheduledAt <= :to', { to: new Date(`${to}T23:59:59`) });

    const [data, total] = await qb.getManyAndCount();

    return { appointments: data.map(a => this.format(a)), total, page, limit };
  }

  // ─── Get one ──────────────────────────────────────────────────────────────
  async findOne(id: number, userId: number, role: string) {
    const appt = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'doctor.specialty', 'patient'],
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);
    return this.format(appt);
  }

  // ─── Reschedule / status update ───────────────────────────────────────────
  async update(id: number, dto: UpdateAppointmentDto, userId: number, role: string) {
    const appt = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'doctor.specialty', 'patient'],
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);

    if ([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED].includes(appt.status)) {
      throw new BadRequestException('Cannot update a completed or cancelled appointment');
    }

    // Handle status change
    if (dto.status) {
      if (dto.status === AppointmentStatus.CANCELLED) {
        appt.status = AppointmentStatus.CANCELLED;
        await this.appointmentRepo.save(appt);
        await this.recordHistory(id, 'CANCELLED', userId);
        return this.format(appt);
      }
      if (
        [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED].includes(dto.status) &&
        ![UserRole.DOCTOR, UserRole.ADMIN].includes(role as UserRole)
      ) {
        throw new ForbiddenException('Only doctors or admins can confirm or complete appointments');
      }
      appt.status = dto.status;
    }

    // Handle reschedule
    if (dto.date || dto.startTime || dto.endTime) {
      const currentDate = appt.scheduledAt.toISOString().split('T')[0];
      const currentStart = appt.scheduledAt.toTimeString().slice(0, 5);
      const currentEnd = this.computeEndTime(appt.scheduledAt, appt.duration);

      const date = dto.date ?? currentDate;
      const startTime = dto.startTime ?? currentStart;
      const endTime = dto.endTime ?? currentEnd;

      const oldTime = appt.scheduledAt;
      appt.scheduledAt = new Date(`${date}T${startTime}:00`);
      appt.duration = this.parseDuration(startTime, endTime);

      // If the doctor reschedules, they are implicitly agreeing to the new time
      // so the appointment stays CONFIRMED. If the patient reschedules, the doctor
      // must re-confirm the new time, so it drops to RESCHEDULED.
      if (role !== UserRole.DOCTOR) {
        appt.status = AppointmentStatus.RESCHEDULED;
      }

      await this.appointmentRepo.save(appt);
      await this.recordHistory(id, 'RESCHEDULED', userId, oldTime, appt.scheduledAt);
      return this.format(appt);
    }

    if (dto.type) appt.mode = TYPE_TO_MODE[dto.type];

    await this.appointmentRepo.save(appt);
    return this.format(appt);
  }

  // ─── Confirm (doctor or admin) ────────────────────────────────────────────
  async confirm(id: number, userId: number, role: string) {
    if (![UserRole.DOCTOR, UserRole.ADMIN].includes(role as UserRole)) {
      throw new ForbiddenException('Only doctors or admins can confirm appointments');
    }
    const appt = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'doctor.specialty', 'patient'],
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);
    appt.status = AppointmentStatus.CONFIRMED;
    await this.appointmentRepo.save(appt);
    await this.recordHistory(id, 'CONFIRMED', userId);
    return this.format(appt);
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────
  async cancel(id: number, dto: CancelAppointmentDto, userId: number, role: string) {
    const appt = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'doctor.specialty', 'patient'],
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);

    if (appt.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    appt.status = AppointmentStatus.CANCELLED;
    appt.cancellationReason = dto.reason ?? null;
    await this.appointmentRepo.save(appt);
    await this.recordHistory(id, 'CANCELLED', userId, undefined, undefined, dto.reason);
    return { message: 'Appointment cancelled' };
  }

  // ─── Consultation session ─────────────────────────────────────────────────
  async createSession(appointmentId: number, dto: CreateSessionDto, userId: number, role: string) {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);

    if (appt.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException('Appointment must be confirmed before creating a session');
    }

    const existing = await this.sessionRepo.findOne({ where: { appointmentId } });
    if (existing) throw new BadRequestException('Session already exists for this appointment');

    const session = this.sessionRepo.create({ appointmentId, provider: dto.provider, roomUrl: dto.roomUrl });
    return this.sessionRepo.save(session);
  }

  async getSession(appointmentId: number, userId: number, role: string) {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);
    
    let session = await this.sessionRepo.findOne({ where: { appointmentId } });
    
    // Auto-create session if it doesn't exist
    if (!session) {
      if (appt.status !== AppointmentStatus.CONFIRMED) {
        throw new BadRequestException('Appointment must be confirmed before a session can be accessed');
      }
      session = this.sessionRepo.create({
        appointmentId,
        provider: 'telemedicine-internal',
        roomUrl: `/room/${appointmentId}`
      });
      session = await this.sessionRepo.save(session);
    }
    
    return session;
  }

  async getSessionToken(appointmentId: number, userId: number, role: string) {
    const session = await this.getSession(appointmentId, userId, role);

    const appId = this.config.get<string>('AGORA_APP_ID');
    const certificate = this.config.get<string>('AGORA_APP_CERTIFICATE');

    if (!appId || !certificate) {
      throw new InternalServerErrorException('Agora credentials are not configured');
    }

    const channelName = `appointment-${appointmentId}`;
    const expireAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // uid=0 means the token is valid for any UID joining this channel.
    // The channel name is the security boundary.
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      channelName,
      0,
      RtcRole.PUBLISHER,
      expireAt,
      expireAt,
    );

    return {
      token,
      appId,
      channel: channelName,
      uid: 0,
      roomUrl: session.roomUrl,
      expiresAt: new Date(expireAt * 1000).toISOString(),
    };
  }

  async startSession(appointmentId: number, userId: number, role: string) {
    const session = await this.getSession(appointmentId, userId, role);
    const now = new Date();

    if (!session.startedAt) session.startedAt = now;

    if (role === UserRole.DOCTOR && !session.doctorJoinedAt) {
      session.doctorJoinedAt = now;
    } else if (role === UserRole.PATIENT && !session.patientJoinedAt) {
      session.patientJoinedAt = now;
    }

    return this.sessionRepo.save(session);
  }

  async endSession(appointmentId: number, userId: number, role: string) {
    const session = await this.getSession(appointmentId, userId, role);
    session.endedAt = new Date();
    if (session.startedAt) {
      session.durationSeconds = Math.round(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
      );
    }
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (appt) {
      appt.status = AppointmentStatus.COMPLETED;
      await this.appointmentRepo.save(appt);
      await this.recordHistory(appointmentId, 'COMPLETED', userId);
    }
    return this.sessionRepo.save(session);
  }

  // ─── Consultation notes ───────────────────────────────────────────────────
  async upsertNote(appointmentId: number, dto: UpsertConsultationNoteDto, userId: number, role: string) {
    if (role !== UserRole.DOCTOR) throw new ForbiddenException('Only doctors can write consultation notes');
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    let note = await this.noteRepo.findOne({ where: { appointmentId } });
    if (!note) {
      note = this.noteRepo.create({ appointmentId, doctorId: doctor.id, patientId: appt.patientId, isSharedWithPatient: false });
    }
    Object.assign(note, dto);
    
    // Auto-share with patient if a patient note is provided
    if (dto.patientNotes) {
      note.isSharedWithPatient = true;
    }

    return this.noteRepo.save(note);
  }

  async getNote(appointmentId: number, userId: number, role: string) {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);
    const note = await this.noteRepo.findOne({ where: { appointmentId } });
    if (!note) throw new NotFoundException('Consultation notes not found');

    if (role === UserRole.PATIENT) {
      if (!note.isSharedWithPatient) {
        throw new ForbiddenException('Notes have not been shared by the doctor yet');
      }
      // Strip out the private extensive clinical note before returning to the patient
      delete (note as any).clinicalNote;
    }

    return note;
  }

  // ─── Prescriptions ───────────────────────────────────────────────────────
  async createPrescription(appointmentId: number, dto: CreatePrescriptionDto, userId: number, role: string): Promise<Prescription> {
    if (role !== UserRole.DOCTOR) throw new ForbiddenException('Only doctors can issue prescriptions');

    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);

    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const prescription = this.prescriptionRepo.create({
      appointmentId,
      doctorId: doctor.id,
      patientId: appt.patientId,
      medications: dto.medications,
      instructions: dto.instructions,
      issuedAt: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    return this.prescriptionRepo.save(prescription);
  }

  async updatePrescription(appointmentId: number, dto: UpdatePrescriptionDto, userId: number, role: string): Promise<Prescription> {
    if (role !== UserRole.DOCTOR) throw new ForbiddenException('Only doctors can update prescriptions');

    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);

    const prescription = await this.prescriptionRepo.findOne({ where: { appointmentId } });
    if (!prescription) throw new NotFoundException('Prescription not found for this appointment');

    Object.assign(prescription, dto);
    return this.prescriptionRepo.save(prescription);
  }

  async getPrescription(appointmentId: number, userId: number, role: string): Promise<Prescription> {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    await this.assertAccess(appt, userId, role);

    const prescription = await this.prescriptionRepo.findOne({
      where: { appointmentId },
      relations: ['doctor', 'patient'],
    });
    if (!prescription) throw new NotFoundException('Prescription not found for this appointment');
    return prescription;
  }

  async listPrescriptions(userId: number, role: string): Promise<Prescription[]> {
    if (role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId } });
      if (!doctor) return [];
      return this.prescriptionRepo.find({
        where: { doctorId: doctor.id },
        relations: ['patient'],
        order: { issuedAt: 'DESC' },
      });
    }
    if (role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId } });
      if (!patient) return [];
      return this.prescriptionRepo.find({
        where: { patientId: patient.id },
        relations: ['doctor'],
        order: { issuedAt: 'DESC' },
      });
    }
    return this.prescriptionRepo.find({ relations: ['doctor', 'patient'], order: { issuedAt: 'DESC' } });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private format(appt: Appointment) {
    const startTime = appt.scheduledAt.toTimeString().slice(0, 5);
    const endTime = this.computeEndTime(appt.scheduledAt, appt.duration);
    const date = appt.scheduledAt.toISOString().split('T')[0];

    return {
      id: appt.id,
      date,
      startTime,
      endTime,
      reason: appt.notes,
      type: MODE_TO_TYPE[appt.mode],
      status: appt.status,
      noShowBy: appt.noShowBy ?? null,
      cancellationReason: appt.cancellationReason,
      doctor: appt.doctor
        ? {
          id: appt.doctor.id,
          userId: appt.doctor.userId,
          firstName: appt.doctor.firstName,
          lastName: appt.doctor.lastName,
          specialty: appt.doctor.specialty
            ? { id: appt.doctor.specialty.id, name: appt.doctor.specialty.name }
            : null,
        }
        : undefined,
      patient: appt.patient
        ? {
          id: appt.patient.id,
          userId: appt.patient.userId,
          firstName: appt.patient.firstName,
          lastName: appt.patient.lastName,
        }
        : undefined,
      createdAt: appt.createdAt,
    };
  }

  private parseDuration(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    if (duration <= 0) throw new BadRequestException('endTime must be after startTime');
    return duration;
  }

  private computeEndTime(scheduledAt: Date, duration: number): string {
    const end = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    return end.toTimeString().slice(0, 5);
  }

  private async recordHistory(
    appointmentId: number,
    action: string,
    performedByUserId: number,
    oldTime?: Date,
    newTime?: Date,
    reason?: string,
  ) {
    await this.historyRepo.save(
      this.historyRepo.create({ appointmentId, action, performedByUserId, oldTime, newTime, reason: reason ?? null }),
    );
  }

  private async assertAccess(appt: Appointment, userId: number, role: string) {
    if (role === UserRole.ADMIN) return;
    if (role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId } });
      if (Number(patient?.id) !== Number(appt.patientId)) throw new ForbiddenException('Access denied');
    } else if (role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId } });
      if (Number(doctor?.id) !== Number(appt.doctorId)) throw new ForbiddenException('Access denied');
    }
  }
}
