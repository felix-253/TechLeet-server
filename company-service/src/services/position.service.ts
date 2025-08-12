import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { PositionEntity } from '../entities/master/position.entity';
import { 
   CreatePositionDto, 
   UpdatePositionDto, 
   GetPositionsQueryDto,
   PositionResponseDto 
} from '../dto/position.dto';

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
      const { page = 0, limit = 10, keyword, sortBy = 'positionId', sortOrder = 'ASC' } = query;

      const findOptions: FindManyOptions<PositionEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
      };

      if (keyword) {
         findOptions.where = {
            positionName: Like(`%${keyword}%`),
         };
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
      });

      if (!position) {
         throw new NotFoundException(`Position with ID ${id} not found`);
      }

      return this.mapToResponseDto(position);
   }

   async update(id: number, updatePositionDto: UpdatePositionDto): Promise<PositionResponseDto> {
      const position = await this.positionRepository.findOne({
         where: { positionId: id },
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

   private mapToResponseDto(position: PositionEntity): PositionResponseDto {
      return {
         positionId: position.positionId,
         positionName: position.positionName,
      };
   }
}
