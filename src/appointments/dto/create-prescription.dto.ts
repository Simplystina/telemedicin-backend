import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';

export class MedicationDto {
  @IsString()
  name!: string;

  @IsString()
  dosage!: string;

  @IsString()
  frequency!: string;

  @IsString()
  duration!: string;

  @IsString()
  unit!: string;
}

export class CreatePrescriptionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications!: MedicationDto[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
