import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSpecialtyDto {
  @IsString()
  @IsNotEmpty({ message: 'Specialty name is required' })
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class BulkCreateSpecialtyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSpecialtyDto)
  specialties: CreateSpecialtyDto[];
}
