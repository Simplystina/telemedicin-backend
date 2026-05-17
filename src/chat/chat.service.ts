import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MessagingGateway } from '../messaging/messaging.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @Inject(forwardRef(() => MessagingGateway))
    private readonly gateway: MessagingGateway,
  ) {}

  async openSession(doctorUserId: number, dto: CreateChatSessionDto): Promise<ChatSession> {
    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const patient = await this.patientRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const hasAppointment = await this.appointmentRepo.findOne({
      where: { doctorId: doctor.id, patientId: patient.id },
    });
    if (!hasAppointment) {
      throw new ForbiddenException('You can only open sessions with your own patients');
    }

    const existing = await this.sessionRepo.findOne({
      where: { doctorId: doctor.id, patientId: patient.id, isOpen: true },
    });
    if (existing) {
      throw new BadRequestException('An open session already exists with this patient');
    }

    const session = this.sessionRepo.create({
      doctorId: doctor.id,
      patientId: patient.id,
      isOpen: true,
    });
    const saved = await this.sessionRepo.save(session);

    this.gateway.emitSessionOpened(patient.userId);

    return saved;
  }

  async closeSession(sessionId: number, doctorUserId: number): Promise<ChatSession> {
    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['patient'],
    });
    if (!session) throw new NotFoundException('Chat session not found');
    if (Number(session.doctorId) !== Number(doctor.id)) {
      throw new ForbiddenException('You can only close your own sessions');
    }
    if (!session.isOpen) {
      throw new BadRequestException('Session is already closed');
    }

    session.isOpen = false;
    session.closedAt = new Date();
    const saved = await this.sessionRepo.save(session);

    this.gateway.emitSessionClosed(session.patient.userId);

    return saved;
  }

  async listSessions(doctorUserId: number): Promise<ChatSession[]> {
    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    return this.sessionRepo.find({
      where: { doctorId: doctor.id },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSession(sessionId: number, userId: number): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['doctor', 'doctor.user', 'patient', 'patient.user'],
    });
    if (!session) throw new NotFoundException('Chat session not found');

    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    const patient = await this.patientRepo.findOne({ where: { userId } });

    const isDoctorInSession = Number(doctor?.id) === Number(session.doctorId);
    const isPatientInSession = Number(patient?.id) === Number(session.patientId);

    if (!isDoctorInSession && !isPatientInSession) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  async getMyStatus(patientUserId: number, doctorUserId?: number) {
    const patient = await this.patientRepo.findOne({ where: { userId: patientUserId } });
    if (!patient) return { isOpen: false, sessionId: null };

    const where: any = { patientId: patient.id, isOpen: true };

    if (doctorUserId) {
      const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
      if (doctor) where.doctorId = doctor.id;
    }

    const session = await this.sessionRepo.findOne({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      isOpen: !!session,
      sessionId: session?.id ?? null,
    };
  }
}
