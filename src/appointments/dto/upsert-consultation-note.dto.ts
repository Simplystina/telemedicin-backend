import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertConsultationNoteDto {
  @IsOptional()
  @IsString()
  clinicalNote?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  patientNotes?: string;

  @IsOptional()
  @IsBoolean()
  isSharedWithPatient?: boolean;
}
