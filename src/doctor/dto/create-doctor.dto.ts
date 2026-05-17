import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

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
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  yearsOfPractice?: string;
  
}
