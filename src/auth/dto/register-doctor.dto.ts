import {
  IsEmail,
  IsOptional,
  IsString,
  IsInt,
  MinLength,
} from 'class-validator';

/**
 * Used by POST /auth/register-doctor
 * Combines account credentials + optional doctor profile fields.
 * Profile fields can be filled in later via PATCH /doctors/:id,
 * but accepting them at registration lets you do it in one step.
 */
export class RegisterDoctorDto {
  // ── Account credentials ───────────────────────────────────────────────────
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsInt()
  specialtyId?: number;

  @IsOptional()
  @IsString()
  hospital?: string;

  @IsOptional()
  @IsString()
  licenseNo?: string;

  @IsOptional()
  @IsString()
  experience?: string;

}
