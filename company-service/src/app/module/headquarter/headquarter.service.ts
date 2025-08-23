import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { HeadquarterEntity } from '../../../entities/master/headquarter.entity';
import { 
   CreateHeadquarterDto, 
   UpdateHeadquarterDto, 
   GetHeadquartersQueryDto,
   HeadquarterResponseDto 
} from './headquarter.dto';

@Injectable()
export class HeadquarterService {
   constructor(
      @InjectRepository(HeadquarterEntity)
      private readonly headquarterRepository: Repository<HeadquarterEntity>,
   ) {}

   async create(createHeadquarterDto: CreateHeadquarterDto): Promise<HeadquarterResponseDto> {
      try {
         // Check if headquarter name already exists
         const existingHeadquarter = await this.headquarterRepository.findOne({
            where: { headquarterName: createHeadquarterDto.headquarterName },
         });

         if (existingHeadquarter) {
            throw new BadRequestException('Headquarter name already exists');
         }

         // Check if email already exists
         const existingEmail = await this.headquarterRepository.findOne({
            where: { headquarterEmail: createHeadquarterDto.headquarterEmail },
         });

         if (existingEmail) {
            throw new BadRequestException('Email address already exists');
         }

         // If this is set as main headquarter, unset others
         if (createHeadquarterDto.isMainHeadquarter) {
            await this.headquarterRepository.update(
               { isMainHeadquarter: true },
               { isMainHeadquarter: false }
            );
         }

         const headquarter = this.headquarterRepository.create(createHeadquarterDto);
         const savedHeadquarter = await this.headquarterRepository.save(headquarter);
         
         return this.mapToResponseDto(savedHeadquarter);
      } catch (error) {
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new BadRequestException('Failed to create headquarter');
      }
   }

   async findAll(query: GetHeadquartersQueryDto): Promise<{ data: HeadquarterResponseDto[]; total: number }> {
      const { page = 0, limit = 10, keyword, sortBy = 'headquarterId', sortOrder = 'ASC' } = query;

      const findOptions: FindManyOptions<HeadquarterEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
         relations: ['departments'],
      };

      if (keyword) {
         findOptions.where = [
            { headquarterName: Like(`%${keyword}%`) },
            { city: Like(`%${keyword}%`) },
         ];
      }

      const [headquarters, total] = await this.headquarterRepository.findAndCount(findOptions);

      return {
         data: headquarters.map(hq => this.mapToResponseDto(hq)),
         total,
      };
   }

   async findOne(id: number): Promise<HeadquarterResponseDto> {
      const headquarter = await this.headquarterRepository.findOne({
         where: { headquarterId: id },
         relations: ['departments'],
      });

      if (!headquarter) {
         throw new NotFoundException(`Headquarter with ID ${id} not found`);
      }

      return this.mapToResponseDto(headquarter);
   }

   async update(id: number, updateHeadquarterDto: UpdateHeadquarterDto): Promise<HeadquarterResponseDto> {
      const headquarter = await this.headquarterRepository.findOne({
         where: { headquarterId: id },
      });

      if (!headquarter) {
         throw new NotFoundException(`Headquarter with ID ${id} not found`);
      }

      // Check if new headquarter name already exists (if name is being updated)
      if (updateHeadquarterDto.headquarterName && updateHeadquarterDto.headquarterName !== headquarter.headquarterName) {
         const existingHeadquarter = await this.headquarterRepository.findOne({
            where: { headquarterName: updateHeadquarterDto.headquarterName },
         });

         if (existingHeadquarter) {
            throw new BadRequestException('Headquarter name already exists');
         }
      }

      // Check if new email already exists (if email is being updated)
      if (updateHeadquarterDto.headquarterEmail && updateHeadquarterDto.headquarterEmail !== headquarter.headquarterEmail) {
         const existingEmail = await this.headquarterRepository.findOne({
            where: { headquarterEmail: updateHeadquarterDto.headquarterEmail },
         });

         if (existingEmail) {
            throw new BadRequestException('Email address already exists');
         }
      }

      // If this is being set as main headquarter, unset others
      if (updateHeadquarterDto.isMainHeadquarter && !headquarter.isMainHeadquarter) {
         await this.headquarterRepository.update(
            { isMainHeadquarter: true },
            { isMainHeadquarter: false }
         );
      }

      Object.assign(headquarter, updateHeadquarterDto);
      const updatedHeadquarter = await this.headquarterRepository.save(headquarter);

      return this.mapToResponseDto(updatedHeadquarter);
   }

   async remove(id: number): Promise<void> {
      const headquarter = await this.headquarterRepository.findOne({
         where: { headquarterId: id },
         relations: ['departments'],
      });

      if (!headquarter) {
         throw new NotFoundException(`Headquarter with ID ${id} not found`);
      }

      // Check if headquarter has departments
      if (headquarter.departments && headquarter.departments.length > 0) {
         throw new BadRequestException('Cannot delete headquarter that has departments. Please move or delete departments first.');
      }

      // Check if this is the main headquarter
      if (headquarter.isMainHeadquarter) {
         throw new BadRequestException('Cannot delete the main headquarter. Please set another headquarter as main first.');
      }

      await this.headquarterRepository.remove(headquarter);
   }

   async findMainHeadquarter(): Promise<HeadquarterResponseDto | null> {
      const mainHeadquarter = await this.headquarterRepository.findOne({
         where: { isMainHeadquarter: true },
         relations: ['departments'],
      });

      return mainHeadquarter ? this.mapToResponseDto(mainHeadquarter) : null;
   }

   async setMainHeadquarter(id: number): Promise<HeadquarterResponseDto> {
      const headquarter = await this.headquarterRepository.findOne({
         where: { headquarterId: id },
      });

      if (!headquarter) {
         throw new NotFoundException(`Headquarter with ID ${id} not found`);
      }

      // Unset current main headquarter
      await this.headquarterRepository.update(
         { isMainHeadquarter: true },
         { isMainHeadquarter: false }
      );

      // Set new main headquarter
      headquarter.isMainHeadquarter = true;
      const updatedHeadquarter = await this.headquarterRepository.save(headquarter);

      return this.mapToResponseDto(updatedHeadquarter);
   }

   private mapToResponseDto(headquarter: HeadquarterEntity): HeadquarterResponseDto {
      return {
         headquarterId: headquarter.headquarterId,
         headquarterName: headquarter.headquarterName,
         headquarterAddress: headquarter.headquarterAddress,
         headquarterPhone: headquarter.headquarterPhone,
         headquarterEmail: headquarter.headquarterEmail,
         city: headquarter.city,
         postalCode: headquarter.postalCode,
         description: headquarter.description,
         isMainHeadquarter: headquarter.isMainHeadquarter,
         departmentCount: headquarter.departments?.length || 0,
      };
   }
}
