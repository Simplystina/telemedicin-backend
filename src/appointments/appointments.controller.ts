import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ConsultationNote } from './entities/consultation-note.entity';
import { UpsertConsultationNoteDto } from './dto/upsert-consultation-note.dto';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ══════════════════════════════════════════════════════════════════════════
  //  APPOINTMENTS  —  /appointments
  // ══════════════════════════════════════════════════════════════════════════

  /** POST /appointments — patient books an appointment */
  @Roles(UserRole.PATIENT)
  @Post('appointments')
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.create(dto, user.id);
  }

  /** GET /appointments — role-scoped list */
  @Get('appointments')
  findAll(
    @Query() query: ListAppointmentsQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.findAll(user.id, user.role, query);
  }

  /** GET /appointments/:id */
  @Get('appointments/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.findOne(id, user.id, user.role);
  }

  /** PATCH /appointments/:id — reschedule */
  @Patch('appointments/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.update(id, dto, user.id, user.role);
  }

  /** POST /appointments/:id/confirm — doctor or admin */
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('appointments/:id/confirm')
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.confirm(id, user.id, user.role);
  }

  /** POST /appointments/:id/cancel */
  @HttpCode(HttpStatus.OK)
  @Post('appointments/:id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.cancel(id, dto, user.id, user.role);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CONSULTATIONS  —  /consultations/:appointmentId/...
  // ══════════════════════════════════════════════════════════════════════════

  /** POST /consultations/:appointmentId/session — create the session room */
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @Post('consultations/:appointmentId/session')
  createSession(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.createSession(appointmentId, dto, user.id, user.role);
  }

  /** GET /consultations/:appointmentId/session — retrieve session details */
  @Get('consultations/:appointmentId/session')
  getSession(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.getSession(appointmentId, user.id, user.role);
  }

  /**
   * GET /consultations/:appointmentId/session/token
   * Returns a short-lived provider token (e.g. Agora RTC) for the caller.
   * MUST be a separate endpoint — each participant fetches their own token.
   */
  @Get('consultations/:appointmentId/session/token')
  getSessionToken(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.getSessionToken(appointmentId, user.id, user.role);
  }

  /** POST /consultations/:appointmentId/session/start */
  @Roles(UserRole.DOCTOR, UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @Post('consultations/:appointmentId/session/start')
  startSession(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.startSession(appointmentId, user.id, user.role);
  }

  /** POST /consultations/:appointmentId/session/end */
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @Post('consultations/:appointmentId/session/end')
  endSession(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.endSession(appointmentId, user.id, user.role);
  }

  /** POST /consultations/:appointmentId/notes — doctor writes notes */
  @Roles(UserRole.DOCTOR)
  @Post('consultations/:appointmentId/notes')
  createNote(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: UpsertConsultationNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.upsertNote(appointmentId, dto, user.id, user.role);
  }

  /** PATCH /consultations/:appointmentId/notes — update notes */
  @Roles(UserRole.DOCTOR)
  @Patch('consultations/:appointmentId/notes')
  updateNote(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: UpsertConsultationNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.upsertNote(appointmentId, dto, user.id, user.role);
  }

  /** GET /consultations/:appointmentId/notes */
  @Get('consultations/:appointmentId/notes')
  getNote(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.getNote(appointmentId, user.id, user.role);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRESCRIPTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /prescriptions — role-scoped list (doctor sees own, patient sees own) */
  @Get('prescriptions')
  listPrescriptions(@CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.listPrescriptions(user.id, user.role);
  }

  /** POST /appointments/:id/prescriptions — doctor issues a prescription */
  @Roles(UserRole.DOCTOR)
  @Post('appointments/:id/prescriptions')
  createPrescription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.createPrescription(id, dto, user.id, user.role);
  }

  /** PATCH /appointments/:id/prescriptions — doctor updates a prescription */
  @Roles(UserRole.DOCTOR)
  @Patch('appointments/:id/prescriptions')
  updatePrescription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.updatePrescription(id, dto, user.id, user.role);
  }

  /** GET /appointments/:id/prescriptions — fetch prescription for an appointment */
  @Get('appointments/:id/prescriptions')
  getPrescription(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.getPrescription(id, user.id, user.role);
  }
}
