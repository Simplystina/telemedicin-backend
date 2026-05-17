import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { FilterDoctorDto } from '../doctor/dto/filter-doctor.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Doctors ───────────────────────────────────────────────────────────────

  /**
   * GET /admin/doctors
   * Returns all doctors regardless of status (pending, verified, suspended).
   * Supports ?status=, ?search=, ?specialtyId=, ?page=, ?limit=
   */
  @Get('doctors')
  getAllDoctors(
    @Query() pagination: PaginationDto,
    @Query() filter: FilterDoctorDto,
  ) {
    return this.adminService.getAllDoctors(pagination, filter);
  }

  /**
   * GET /admin/doctors/:id
   * Returns a single doctor's full profile.
   */
  @Get('doctors/:id')
  getDoctor(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getDoctor(id);
  }

  /**
   * PATCH /admin/doctors/:id/status
   * Verify, suspend, or reset a doctor back to pending.
   * Body: { "status": "verified" | "pending" | "suspended" }
   */
  @Patch('doctors/:id/status')
  updateDoctorStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorStatusDto,
    @CurrentUser() _admin: CurrentUserPayload,
  ) {
    return this.adminService.updateDoctorStatus(id, dto.status);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  /**
   * GET /admin/dashboard
   * High-level stats: doctors (total/verified/pending/suspended), users, specialties.
   */
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }
}
