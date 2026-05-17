import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Appointment, AppointmentStatus, NoShowBy } from './entities/appointment.entity';
import { ConsultationSession } from './entities/consultation-session.entity';

// Grace period after appointment should have ended before we sweep
const GRACE_MINUTES = 60;

@Injectable()
export class AppointmentSweepService {
  private readonly logger = new Logger(AppointmentSweepService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(ConsultationSession)
    private readonly sessionRepo: Repository<ConsultationSession>,
  ) {}

  @Cron('*/15 * * * *')
  async sweep() {
    this.logger.log('Running appointment sweep...');
    await Promise.all([
      this.resolveNoShows(),
      this.expirePendingAppointments(),
    ]);
  }

  // ─── Mark no-shows for CONFIRMED appointments whose time has fully passed ──
  private async resolveNoShows() {
    const now = new Date();

    // Load CONFIRMED appointments whose scheduled time is in the past
    // We'll filter by grace period in code since duration varies per appointment
    const confirmed = await this.appointmentRepo.find({
      where: { status: AppointmentStatus.CONFIRMED },
    });

    for (const appt of confirmed) {
      const appointmentEndMs = appt.scheduledAt.getTime() + appt.duration * 60 * 1000;
      const graceEndMs = appointmentEndMs + GRACE_MINUTES * 60 * 1000;

      if (now.getTime() < graceEndMs) continue; // grace period not yet over

      const session = await this.sessionRepo.findOne({
        where: { appointmentId: appt.id },
      });

      if (!session) {
        // No session was ever created — both no-showed
        appt.status = AppointmentStatus.NO_SHOW;
        appt.noShowBy = NoShowBy.BOTH;
        await this.appointmentRepo.save(appt);
        this.logger.log(`Appointment #${appt.id} marked NO_SHOW (both) — no session created`);
        continue;
      }

      if (!session.doctorJoinedAt && !session.patientJoinedAt) {
        // Session created but nobody joined
        appt.status = AppointmentStatus.NO_SHOW;
        appt.noShowBy = NoShowBy.BOTH;
        await this.appointmentRepo.save(appt);
        this.logger.log(`Appointment #${appt.id} marked NO_SHOW (both) — session unused`);
        continue;
      }

      if (!session.doctorJoinedAt) {
        appt.status = AppointmentStatus.NO_SHOW;
        appt.noShowBy = NoShowBy.DOCTOR;
        await this.appointmentRepo.save(appt);
        this.logger.log(`Appointment #${appt.id} marked NO_SHOW (doctor)`);
        continue;
      }

      if (!session.patientJoinedAt) {
        appt.status = AppointmentStatus.NO_SHOW;
        appt.noShowBy = NoShowBy.PATIENT;
        await this.appointmentRepo.save(appt);
        this.logger.log(`Appointment #${appt.id} marked NO_SHOW (patient)`);
        continue;
      }

      // Both joined but doctor forgot to end the session — auto-complete it
      if (!session.endedAt) {
        session.endedAt = new Date(appointmentEndMs);
        if (session.startedAt) {
          session.durationSeconds = Math.round(
            (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
          );
        }
        await this.sessionRepo.save(session);

        appt.status = AppointmentStatus.COMPLETED;
        await this.appointmentRepo.save(appt);
        this.logger.log(`Appointment #${appt.id} auto-completed — session end was not called`);
      }
    }
  }

  // ─── Cancel stale PENDING appointments whose time has passed ─────────────
  private async expirePendingAppointments() {
    const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);

    const stale = await this.appointmentRepo.find({
      where: {
        status: AppointmentStatus.PENDING,
        scheduledAt: LessThan(cutoff),
      },
    });

    for (const appt of stale) {
      appt.status = AppointmentStatus.EXPIRED;
      await this.appointmentRepo.save(appt);
      this.logger.log(`Appointment #${appt.id} expired (was PENDING past scheduled time)`);
    }
  }
}
