import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { SpecialtyService } from './specialty.service';
import { CreateSpecialtyDto, BulkCreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('specialties')
export class SpecialtyController {
  constructor(private readonly specialtyService: SpecialtyService) {}

  // ── Public read routes ──────────────────────────────────────────────────────

  /** GET /specialties — list all specialties (public, used by patients & doctors) */
  @Public()
  @Get()
  findAll() {
    return this.specialtyService.findAll();
  }

  /** GET /specialties/:id — single specialty details (public) */
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.specialtyService.findOne(id);
  }

  // ── Admin-only write routes ─────────────────────────────────────────────────

  /** POST /specialties — create a single specialty (admin only) */
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtyService.create(dto);
  }

  /** POST /specialties/bulk — create multiple specialties at once (admin only) */
  @Roles(UserRole.ADMIN)
  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateSpecialtyDto) {
    return this.specialtyService.bulkCreate(dto.specialties);
  }

  /** PATCH /specialties/:id — update a specialty (admin only) */
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
  ) {
    return this.specialtyService.update(id, dto);
  }

  /** DELETE /specialties/:id — remove a specialty (admin only) */
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.specialtyService.remove(id);
  }
}
