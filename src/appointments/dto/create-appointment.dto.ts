import { IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export enum AppointmentType {
  VIDEO = 'video',
  IN_PERSON = 'in-person',
  AUDIO = 'audio',
  CHAT = 'chat',
}

export class CreateAppointmentDto {
  @IsInt()
  doctorId!: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime!: string;

  @IsEnum(AppointmentType)
  type!: AppointmentType;

  @IsOptional()
  @IsString()
  reason?: string;
}
