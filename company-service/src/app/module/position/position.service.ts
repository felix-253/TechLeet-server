import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { PositionEntity } from '../../../entities/master/position.entity';
import { 
   CreatePositionDto, 
   UpdatePositionDto, 
   GetPositionsQueryDto,
   PositionResponseDto 
} from './position.dto';

@Injectable()
export class PositionService {
   constructor(
      @InjectRepository(PositionEntity)
      private readonly positionRepository: Repository<PositionEntity>,
   ) {}

   async create(createPositionDto: CreatePositionDto): Promise<PositionResponseDto> {
      try {
         // Check if position name already exists
         const existingPosition = await this.positionRepository.findOne({
            where: { positionName: createPositionDto.positionName },
         });

         if (existingPosition) {
            throw new BadRequestException('Position name already exists');
         }

         // Validate salary range
         if (createPositionDto.minSalary && createPositionDto.maxSalary) {
            if (createPositionDto.minSalary > createPositionDto.maxSalary) {
               throw new BadRequestException('Minimum salary cannot be greater than maximum salary');
            }
         }

         const position = this.positionRepository.create(createPositionDto);
         const savedPosition = await this.positionRepository.save(position);

         return this.mapToResponseDto(savedPosition);
      } catch (error) {
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new BadRequestException('Failed to create position');
      }
   }

   async findAll(query: GetPositionsQueryDto): Promise<{ data: PositionResponseDto[]; total: number }> {
      const {
         page = 0,
         limit = 10,
         keyword,
         positionTypeId,
         minLevel,
         maxLevel,
         sortBy = 'positionId',
         sortOrder = 'ASC'
      } = query;

      const findOptions: FindManyOptions<PositionEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
         relations: ['positionType'],
      };

      // Build where conditions
      const whereConditions: any = {};

      if (keyword) {
         whereConditions.positionName = Like(`%${keyword}%`);
      }

      if (positionTypeId) {
         whereConditions.positionTypeId = positionTypeId;
      }

      if (minLevel) {
         whereConditions.level = { $gte: minLevel };
      }

      if (maxLevel) {
         if (whereConditions.level) {
            whereConditions.level = { ...whereConditions.level, $lte: maxLevel };
         } else {
            whereConditions.level = { $lte: maxLevel };
         }
      }

      if (Object.keys(whereConditions).length > 0) {
         findOptions.where = whereConditions;
      }

      const [positions, total] = await this.positionRepository.findAndCount(findOptions);

      return {
         data: positions.map(pos => this.mapToResponseDto(pos)),
         total,
      };
   }

   async findOne(id: number): Promise<PositionResponseDto> {
      const position = await this.positionRepository.findOne({
         where: { positionId: id },
         relations: ['positionType'],
      });

      if (!position) {
         throw new NotFoundException(`Position with ID ${id} not found`);
      }

      return this.mapToResponseDto(position);
   }

   async update(id: number, updatePositionDto: UpdatePositionDto): Promise<PositionResponseDto> {
      const position = await this.positionRepository.findOne({
         where: { positionId: id },
         relations: ['positionType'],
      });

      if (!position) {
         throw new NotFoundException(`Position with ID ${id} not found`);
      }

      // Check if new position name already exists (if name is being updated)
      if (updatePositionDto.positionName && updatePositionDto.positionName !== position.positionName) {
         const existingPosition = await this.positionRepository.findOne({
            where: { positionName: updatePositionDto.positionName },
         });

         if (existingPosition) {
            throw new BadRequestException('Position name already exists');
         }
      }

      // Validate salary range if both are provided
      const newMinSalary = updatePositionDto.minSalary ?? position.minSalary;
      const newMaxSalary = updatePositionDto.maxSalary ?? position.maxSalary;

      if (newMinSalary && newMaxSalary && newMinSalary > newMaxSalary) {
         throw new BadRequestException('Minimum salary cannot be greater than maximum salary');
      }

      Object.assign(position, updatePositionDto);
      const updatedPosition = await this.positionRepository.save(position);

      return this.mapToResponseDto(updatedPosition);
   }

   async remove(id: number): Promise<void> {
      const position = await this.positionRepository.findOne({
         where: { positionId: id },
      });

      if (!position) {
         throw new NotFoundException(`Position with ID ${id} not found`);
      }

      await this.positionRepository.remove(position);
   }

   async findByType(positionTypeId: number): Promise<PositionResponseDto[]> {
      const positions = await this.positionRepository.find({
         where: { positionTypeId },
         relations: ['positionType'],
         order: { positionName: 'ASC' },
      });

      return positions.map(pos => this.mapToResponseDto(pos));
   }

   async findByLevel(level: number): Promise<PositionResponseDto[]> {
      const positions = await this.positionRepository.find({
         where: { level },
         relations: ['positionType'],
         order: { positionName: 'ASC' },
      });

      return positions.map(pos => this.mapToResponseDto(pos));
   }

   async findBySalaryRange(minSalary?: number, maxSalary?: number): Promise<PositionResponseDto[]> {
      const queryBuilder = this.positionRepository.createQueryBuilder('position')
         .leftJoinAndSelect('position.positionType', 'positionType');

      if (minSalary) {
         queryBuilder.andWhere('position.maxSalary >= :minSalary', { minSalary });
      }

      if (maxSalary) {
         queryBuilder.andWhere('position.minSalary <= :maxSalary', { maxSalary });
      }

      queryBuilder.orderBy('position.positionName', 'ASC');

      const positions = await queryBuilder.getMany();
      return positions.map(pos => this.mapToResponseDto(pos));
   }

   private mapToResponseDto(position: PositionEntity): PositionResponseDto {
      const levelDisplayMap = {
         1: 'Entry Level',
         2: 'Junior Level',
         3: 'Senior Level',
         4: 'Lead Level',
         5: 'Manager Level',
      };

      const formatSalary = (amount: number): string => {
         return new Intl.NumberFormat('vi-VN').format(amount);
      };

      const getSalaryRange = (): string | undefined => {
         if (position.minSalary && position.maxSalary) {
            return `${formatSalary(position.minSalary)} - ${formatSalary(position.maxSalary)} VND`;
         } else if (position.minSalary) {
            return `From ${formatSalary(position.minSalary)} VND`;
         } else if (position.maxSalary) {
            return `Up to ${formatSalary(position.maxSalary)} VND`;
         }
         return undefined;
      };

      return {
         positionId: position.positionId,
         positionName: position.positionName,
         description: position.description,
         minSalary: position.minSalary,
         maxSalary: position.maxSalary,
         level: position.level,
         positionCode: position.positionCode,
         requirements: position.requirements,
         positionTypeId: position.positionTypeId,
         positionTypeName: position.positionType?.positionTypeName,
         salaryRange: getSalaryRange(),
         levelDisplay: position.level ? levelDisplayMap[position.level] : undefined,
      };
   }
}
