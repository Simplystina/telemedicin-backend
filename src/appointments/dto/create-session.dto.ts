import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  provider: string; // e.g. 'Agora', 'Daily.co', 'Twilio'

  @IsString()
  @IsNotEmpty()
  roomUrl: string;
}
