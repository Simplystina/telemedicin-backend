import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { LabResultsService, CreateLabResultDto, UpdateLabResultDto, BulkCreateLabResultDto } from './lab-results.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('lab-results')
export class LabResultsController {
  constructor(private readonly labResultsService: LabResultsService) {}

  /** POST /lab-results — doctor requests a lab test */
  @Roles(UserRole.DOCTOR)
  @Post()
  create(@Body() dto: CreateLabResultDto, @CurrentUser() user: CurrentUserPayload) {
    return this.labResultsService.create(dto, user.id);
  }

  /** POST /lab-results/bulk — doctor requests multiple lab tests at once */
  @Roles(UserRole.DOCTOR)
  @Post('bulk')
  createBulk(@Body() dto: BulkCreateLabResultDto, @CurrentUser() user: CurrentUserPayload) {
    return this.labResultsService.createBulk(dto, user.id);
  }

  /** GET /lab-results — role-scoped list */
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.labResultsService.findAll(user.id, user.role);
  }

  /** GET /lab-results/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.labResultsService.findOne(id, user.id, user.role);
  }

  /** PATCH /lab-results/:id — update status, filePath, resultDate */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLabResultDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.labResultsService.update(id, dto, user.id, user.role);
  }
}
