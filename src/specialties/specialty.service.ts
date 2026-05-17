import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from '../doctor/entities/specialty.entity';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtyService {
  constructor(
    @InjectRepository(Specialty)
    private readonly specialtyRepo: Repository<Specialty>,
  ) {}

  async create(dto: CreateSpecialtyDto): Promise<Specialty> {
    const existing = await this.specialtyRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Specialty "${dto.name}" already exists`,
      );
    }

    const specialty = this.specialtyRepo.create(dto);
    return this.specialtyRepo.save(specialty);
  }

  async findAll(): Promise<Specialty[]> {
    return this.specialtyRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Specialty> {
    const specialty = await this.specialtyRepo.findOne({ where: { id } });
    if (!specialty) {
      throw new NotFoundException(`Specialty with ID "${id}" not found`);
    }
    return specialty;
  }

  async update(id: number, dto: UpdateSpecialtyDto): Promise<Specialty> {
    const specialty = await this.findOne(id);

    // Check uniqueness only when the name is being changed
    if (dto.name && dto.name !== specialty.name) {
      const conflict = await this.specialtyRepo.findOne({
        where: { name: dto.name },
      });
      if (conflict) {
        throw new ConflictException(`Specialty "${dto.name}" already exists`);
      }
    }

    Object.assign(specialty, dto);
    return this.specialtyRepo.save(specialty);
  }

  async remove(id: number): Promise<{ message: string }> {
    const specialty = await this.findOne(id);
    await this.specialtyRepo.remove(specialty);
    return { message: `Specialty "${specialty.name}" deleted successfully` };
  }

  async bulkCreate(dtos: CreateSpecialtyDto[]): Promise<{
    created: Specialty[];
    skipped: string[];
    summary: string;
  }> {
    // Fetch all existing names in one query
    const existing = await this.specialtyRepo.find({ select: ['name'] });
    const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));

    const toCreate: CreateSpecialtyDto[] = [];
    const skipped: string[] = [];

    for (const dto of dtos) {
      if (existingNames.has(dto.name.toLowerCase())) {
        skipped.push(dto.name);
      } else {
        toCreate.push(dto);
        // Prevent duplicates within the same request
        existingNames.add(dto.name.toLowerCase());
      }
    }

    const created = toCreate.length > 0
      ? await this.specialtyRepo.save(this.specialtyRepo.create(toCreate))
      : [];

    return {
      created,
      skipped,
      summary: `${created.length} created, ${skipped.length} skipped (already exist).`,
    };
  }
}
