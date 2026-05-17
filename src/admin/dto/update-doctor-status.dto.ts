import { IsEnum } from 'class-validator';
import { DoctorStatus } from '../../doctor/entities/doctor.entity';

export class UpdateDoctorStatusDto {
  @IsEnum(DoctorStatus, {
    message: `Status must be one of: ${Object.values(DoctorStatus).join(', ')}`,
  })
  status: DoctorStatus;
}
