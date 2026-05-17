import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { ChatSession } from './entities/chat-session.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patients/entities/patient.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ChatAccessService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  /**
   * Determines whether a user can send a message to another user.
   * Throws ForbiddenException if access is denied.
   *
   * Rules:
   *  DOCTOR → PATIENT: must have any appointment together OR an open chat session
   *  PATIENT → DOCTOR: must be within the 1hr-before / 1hr-after window of a
   *                     CONFIRMED appointment, OR an open doctor-initiated session
   */
  async assertCanSend(
    senderUserId: number,
    receiverUserId: number,
    senderRole: string,
  ): Promise<void> {
    if (senderRole === UserRole.DOCTOR) {
      await this.assertDoctorCanSend(senderUserId, receiverUserId);
    } else if (senderRole === UserRole.PATIENT) {
      await this.assertPatientCanSend(senderUserId, receiverUserId);
    }
    // Admins bypass all checks
  }

  // ─── Doctor → Patient ──────────────────────────────────────────────────────

  private async assertDoctorCanSend(
    doctorUserId: number,
    patientUserId: number,
  ): Promise<void> {
    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!doctor) throw new ForbiddenException('Doctor profile not found');

    const patient = await this.patientRepo.findOne({ where: { userId: patientUserId } });
    if (!patient) throw new ForbiddenException('Patient profile not found');

    // Allow if they have any appointment together (past or future)
    const hasAppointment = await this.appointmentRepo.findOne({
      where: { doctorId: doctor.id, patientId: patient.id },
    });

    if (hasAppointment) return;

    // Allow if there is an open doctor-initiated session
    const openSession = await this.chatSessionRepo.findOne({
      where: { doctorId: doctor.id, patientId: patient.id, isOpen: true },
    });

    if (openSession) return;

    throw new ForbiddenException(
      'You can only message patients you have an appointment with',
    );
  }

  // ─── Patient → Doctor ──────────────────────────────────────────────────────

  private async assertPatientCanSend(
    patientUserId: number,
    doctorUserId: number,
  ): Promise<void> {
    const patient = await this.patientRepo.findOne({ where: { userId: patientUserId } });
    if (!patient) throw new ForbiddenException('Patient profile not found');

    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!doctor) throw new ForbiddenException('Doctor profile not found');

    // Check appointment window: CONFIRMED + within [scheduledAt - 1hr, scheduledAt + duration + 1hr]
    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    const appointments = await this.appointmentRepo.find({
      where: {
        doctorId: doctor.id,
        patientId: patient.id,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    const withinWindow = appointments.some((appt) => {
      const windowStart = new Date(appt.scheduledAt.getTime() - oneHour);
      const windowEnd = new Date(
        appt.scheduledAt.getTime() + appt.duration * 60 * 1000 + oneHour,
      );
      return now >= windowStart && now <= windowEnd;
    });

    if (withinWindow) return;

    // Allow if doctor has an open session for this patient
    const openSession = await this.chatSessionRepo.findOne({
      where: { doctorId: doctor.id, patientId: patient.id, isOpen: true },
    });

    if (openSession) return;

    throw new ForbiddenException(
      'Chat is only available 1 hour before your appointment and 1 hour after it ends, ' +
      'or when your doctor has opened a session with you.',
    );
  }

  // ─── Helper: check if patient can READ (always true if they have a relationship) ──
  async canRead(patientUserId: number, doctorUserId: number): Promise<boolean> {
    const patient = await this.patientRepo.findOne({ where: { userId: patientUserId } });
    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!patient || !doctor) return false;

    const hasAppointment = await this.appointmentRepo.findOne({
      where: { doctorId: doctor.id, patientId: patient.id },
    });
    return !!hasAppointment;
  }
}
