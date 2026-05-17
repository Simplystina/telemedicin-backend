import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { DoctorStatus } from '../entities/doctor.entity';

export class FilterDoctorDto {
  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;

  @IsOptional()
  @IsInt()
  specialtyId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
