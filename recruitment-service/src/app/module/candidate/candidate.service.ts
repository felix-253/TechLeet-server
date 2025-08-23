import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import {
   CreateCandidateDto,
   UpdateCandidateDto,
   CandidateResponseDto,
   GetCandidatesQueryDto
} from './candidate.dto';

@Injectable()
export class CandidateService {
   constructor(
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
   ) {}

   async create(createCandidateDto: CreateCandidateDto): Promise<CandidateResponseDto> {
      try {
         // Check if email already exists
         const existingCandidate = await this.candidateRepository.findOne({
            where: { email: createCandidateDto.email },
         });

         if (existingCandidate) {
            throw new BadRequestException('Email address already exists');
         }

         // Validate birth date if provided
         if (createCandidateDto.birthDate) {
            const birthDate = new Date(createCandidateDto.birthDate);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            
            if (age < 16 || age > 80) {
               throw new BadRequestException('Candidate age must be between 16 and 80 years');
            }
         }

         // Validate graduation year if provided
         if (createCandidateDto.graduationYear) {
            const currentYear = new Date().getFullYear();
            if (createCandidateDto.graduationYear > currentYear + 10) {
               throw new BadRequestException('Graduation year cannot be more than 10 years in the future');
            }
         }

         const candidate = this.candidateRepository.create({
            ...createCandidateDto,
            birthDate: createCandidateDto.birthDate ? new Date(createCandidateDto.birthDate) : undefined,
            availableStartDate: createCandidateDto.availableStartDate ? new Date(createCandidateDto.availableStartDate) : undefined,
            status: 'new', // Default status
            appliedDate: new Date(),
         });

         const savedCandidate = await this.candidateRepository.save(candidate);
         return this.mapToResponseDto(savedCandidate);
      } catch (error) {
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new BadRequestException('Failed to create candidate');
      }
   }

   async findAll(query: GetCandidatesQueryDto): Promise<{ data: CandidateResponseDto[]; total: number }> {
      const { 
         page = 0, 
         limit = 10, 
         keyword, 
         status,
         minExperience,
         maxExperience,
         skills,
         educationLevel,
         preferredEmploymentType,
         availableForRemote,
         sortBy = 'appliedDate', 
         sortOrder = 'DESC' 
      } = query;

      const queryBuilder = this.candidateRepository.createQueryBuilder('candidate');

      // Pagination
      queryBuilder.skip(page * limit).take(limit);

      // Keyword search
      if (keyword) {
         queryBuilder.andWhere(
            '(candidate.firstName ILIKE :keyword OR candidate.lastName ILIKE :keyword OR candidate.email ILIKE :keyword)',
            { keyword: `%${keyword}%` }
         );
      }

      // Status filter
      if (status) {
         queryBuilder.andWhere('candidate.status = :status', { status });
      }

      // Experience filters
      if (minExperience !== undefined) {
         queryBuilder.andWhere('candidate.yearsOfExperience >= :minExperience', { minExperience });
      }

      if (maxExperience !== undefined) {
         queryBuilder.andWhere('candidate.yearsOfExperience <= :maxExperience', { maxExperience });
      }

      // Skills filter
      if (skills) {
         const skillArray = skills.split(',').map(skill => skill.trim());
         const skillConditions = skillArray.map((_, index) => `candidate.skills ILIKE :skill${index}`).join(' OR ');
         const skillParams = {};
         skillArray.forEach((skill, index) => {
            skillParams[`skill${index}`] = `%${skill}%`;
         });
         queryBuilder.andWhere(`(${skillConditions})`, skillParams);
      }

      // Education level filter
      if (educationLevel) {
         queryBuilder.andWhere('candidate.educationLevel ILIKE :educationLevel', { 
            educationLevel: `%${educationLevel}%` 
         });
      }

      // Employment type filter
      if (preferredEmploymentType) {
         queryBuilder.andWhere('candidate.preferredEmploymentType = :preferredEmploymentType', { 
            preferredEmploymentType 
         });
      }

      // Remote availability filter
      if (availableForRemote !== undefined) {
         queryBuilder.andWhere('candidate.availableForRemote = :availableForRemote', { 
            availableForRemote 
         });
      }

      // Sorting
      queryBuilder.orderBy(`candidate.${sortBy}`, sortOrder);

      const [candidates, total] = await queryBuilder.getManyAndCount();

      return {
         data: candidates.map(candidate => this.mapToResponseDto(candidate)),
         total,
      };
   }

   async findOne(id: number): Promise<CandidateResponseDto> {
      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: id },
      });

      if (!candidate) {
         throw new NotFoundException(`Candidate with ID ${id} not found`);
      }

      return this.mapToResponseDto(candidate);
   }

   async update(id: number, updateCandidateDto: UpdateCandidateDto): Promise<CandidateResponseDto> {
      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: id },
      });

      if (!candidate) {
         throw new NotFoundException(`Candidate with ID ${id} not found`);
      }

      // Check if new email already exists (if email is being updated)
      if (updateCandidateDto.email && updateCandidateDto.email !== candidate.email) {
         const existingCandidate = await this.candidateRepository.findOne({
            where: { email: updateCandidateDto.email },
         });

         if (existingCandidate) {
            throw new BadRequestException('Email address already exists');
         }
      }

      // Validate birth date if provided
      if (updateCandidateDto.birthDate) {
         const birthDate = new Date(updateCandidateDto.birthDate);
         const today = new Date();
         const age = today.getFullYear() - birthDate.getFullYear();
         
         if (age < 16 || age > 80) {
            throw new BadRequestException('Candidate age must be between 16 and 80 years');
         }
      }

      // Validate graduation year if provided
      if (updateCandidateDto.graduationYear) {
         const currentYear = new Date().getFullYear();
         if (updateCandidateDto.graduationYear > currentYear + 10) {
            throw new BadRequestException('Graduation year cannot be more than 10 years in the future');
         }
      }

      // Convert date strings to Date objects
      const updateData = {
         ...updateCandidateDto,
         birthDate: updateCandidateDto.birthDate ? new Date(updateCandidateDto.birthDate) : undefined,
         availableStartDate: updateCandidateDto.availableStartDate ? new Date(updateCandidateDto.availableStartDate) : undefined,
      };

      Object.assign(candidate, updateData);
      const updatedCandidate = await this.candidateRepository.save(candidate);

      return this.mapToResponseDto(updatedCandidate);
   }

   async remove(id: number): Promise<void> {
      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: id },
      });

      if (!candidate) {
         throw new NotFoundException(`Candidate with ID ${id} not found`);
      }

      await this.candidateRepository.softRemove(candidate);
   }

   async findByStatus(status: string): Promise<CandidateResponseDto[]> {
      const candidates = await this.candidateRepository.find({
         where: { status },
         order: { appliedDate: 'DESC' },
      });

      return candidates.map(candidate => this.mapToResponseDto(candidate));
   }

   async findBySkills(skills: string[]): Promise<CandidateResponseDto[]> {
      const queryBuilder = this.candidateRepository.createQueryBuilder('candidate');
      
      const skillConditions = skills.map((_, index) => `candidate.skills ILIKE :skill${index}`).join(' OR ');
      const skillParams = {};
      skills.forEach((skill, index) => {
         skillParams[`skill${index}`] = `%${skill}%`;
      });

      queryBuilder.where(`(${skillConditions})`, skillParams);
      queryBuilder.orderBy('candidate.appliedDate', 'DESC');

      const candidates = await queryBuilder.getMany();
      return candidates.map(candidate => this.mapToResponseDto(candidate));
   }

   async updateStatus(id: number, status: string): Promise<CandidateResponseDto> {
      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: id },
      });

      if (!candidate) {
         throw new NotFoundException(`Candidate with ID ${id} not found`);
      }

      const validStatuses = ['new', 'screening', 'interviewing', 'hired', 'rejected', 'withdrawn'];
      if (!validStatuses.includes(status)) {
         throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      candidate.status = status;
      const updatedCandidate = await this.candidateRepository.save(candidate);

      return this.mapToResponseDto(updatedCandidate);
   }

   private mapToResponseDto(candidate: CandidateEntity): CandidateResponseDto {
      const getAge = (): number | undefined => {
         if (!candidate.birthDate) return undefined;
         const today = new Date();
         const birthDate = new Date(candidate.birthDate);
         let age = today.getFullYear() - birthDate.getFullYear();
         const monthDiff = today.getMonth() - birthDate.getMonth();
         if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
         }
         return age;
      };

      const getFormattedExpectedSalary = (): string | undefined => {
         if (!candidate.expectedSalary) return undefined;
         return new Intl.NumberFormat('vi-VN').format(candidate.expectedSalary) + ' VND';
      };

      return {
         candidateId: candidate.candidateId,
         firstName: candidate.firstName,
         lastName: candidate.lastName,
         email: candidate.email,
         phoneNumber: candidate.phoneNumber,
         birthDate: candidate.birthDate?.toISOString().split('T')[0],
         gender: candidate.gender,
         address: candidate.address,
         resumeUrl: candidate.resumeUrl,
         linkedinUrl: candidate.linkedinUrl,
         githubUrl: candidate.githubUrl,
         portfolioUrl: candidate.portfolioUrl,
         status: candidate.status,
         appliedDate: candidate.appliedDate.toISOString().split('T')[0],
         summary: candidate.summary,
         yearsOfExperience: candidate.yearsOfExperience,
         currentJobTitle: candidate.currentJobTitle,
         currentCompany: candidate.currentCompany,
         educationLevel: candidate.educationLevel,
         fieldOfStudy: candidate.fieldOfStudy,
         university: candidate.university,
         graduationYear: candidate.graduationYear,
         skills: candidate.skills,
         programmingLanguages: candidate.programmingLanguages,
         expectedSalary: candidate.expectedSalary,
         preferredEmploymentType: candidate.preferredEmploymentType,
         availableForRemote: candidate.availableForRemote,
         availableStartDate: candidate.availableStartDate?.toISOString().split('T')[0],
         source: candidate.source,
         fullName: `${candidate.firstName} ${candidate.lastName}`,
         age: getAge(),
         formattedExpectedSalary: getFormattedExpectedSalary(),
         applicationCount: 0, // TODO: Will be populated when applications are implemented
         createdAt: candidate.createdAt.toISOString(),
         updatedAt: candidate.updatedAt.toISOString(),
      };
   }
}
