import { Body, Controller, Get, Patch } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /** GET /patients/me — patient fetches their own profile */
  @Roles(UserRole.PATIENT)
  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.findByUserId(user.id);
  }

  /** PATCH /patients/me — patient updates their own profile */
  @Roles(UserRole.PATIENT)
  @Patch('me')
  updateMe(
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.updateByUserId(user.id, dto);
  }
}
