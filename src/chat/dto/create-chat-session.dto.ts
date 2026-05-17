import { IsInt, IsPositive } from 'class-validator';

export class CreateChatSessionDto {
  @IsInt()
  @IsPositive()
  patientId: number; // the Patient profile ID (not userId)
}
