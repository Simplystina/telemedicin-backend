import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SaveAvailabilityDto } from './dto/save-availability.dto';
import { FilterDoctorDto } from './dto/filter-doctor.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DoctorStatus } from './entities/doctor.entity';

@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) { }

  /** GET /doctors — browse verified doctors (public) */
  @Public()
  @Get()
  findAll(@Query() pagination: PaginationDto, @Query() filter: FilterDoctorDto) {
    filter.status = DoctorStatus.VERIFIED;
    return this.doctorService.findAll(pagination, filter);
  }


  /** GET /doctors/me/dashboard — doctor's personal dashboard stats */
  @Roles(UserRole.DOCTOR)
  @Get('me/dashboard')
  getMyDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.doctorService.getMyDashboard(user.id);
  }

  /** GET /doctors/me/patients — unique patients the doctor has seen */
  @Roles(UserRole.DOCTOR)
  @Get('me/patients')
  getMyPatients(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.doctorService.getMyPatients(user!.id, page, limit);
  }

  /** GET /doctors/me — doctor gets their own profile */
  @Roles(UserRole.DOCTOR)
  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.doctorService.findByUserId(user.id);
  }

  /** PATCH /doctors/me — doctor updates their own profile */
  @Roles(UserRole.DOCTOR)
  @Patch('me')
  updateMe(
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.doctorService.updateByUserId(user.id, dto);
  }

  /** GET /doctors/me/availability — doctor's own weekly schedule or specific date availability */
  @Roles(UserRole.DOCTOR)
  @Get('me/availability')
  getMyAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Query('date') date?: string,
  ) {
    return this.doctorService.getMyAvailability(user.id, date);
  }

  /** PUT /doctors/me/availability — replace doctor's own weekly schedule */
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @Put('me/availability')
  saveMyAvailability(
    @Body() dto: SaveAvailabilityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.doctorService.saveMyAvailability(user.id, dto);
  }

  // ── Parameterised routes ───────────────────────────────────────────────────

  /** GET /doctors/:id — single doctor profile (public) */
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.findOne(id);
  }

  /** GET /doctors/:id/availability — doctor's weekly schedule or specific date availability (public) */
  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date?: string,
  ) {
    return this.doctorService.getAvailability(id, date);
  }

  /** PUT /doctors/:id/availability — replace doctor's weekly schedule */
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.OK)
  @Put(':id/availability')
  saveAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveAvailabilityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.doctorService.saveAvailability(id, dto, user.id);
  }
}
