import { IsEnum, IsOptional, IsString, IsInt } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
  @IsInt()
  receiverId: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  content?: string; // nullable for file/audio/image

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
