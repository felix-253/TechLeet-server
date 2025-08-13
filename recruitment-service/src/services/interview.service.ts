import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between } from 'typeorm';
import { InterviewEntity } from '../entities/recruitment/interview.entity';
import { ApplicationEntity } from '../entities/recruitment/application.entity';
import { 
   CreateInterviewDto, 
   UpdateInterviewDto, 
   InterviewResponseDto, 
   GetInterviewsQueryDto 
} from '../dto/interview.dto';

@Injectable()
export class InterviewService {
   constructor(
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
   ) {}

   async create(createInterviewDto: CreateInterviewDto): Promise<InterviewResponseDto> {
      try {
         // Verify application exists and is in appropriate status
         const application = await this.applicationRepository.findOne({
            where: { applicationId: createInterviewDto.applicationId },
         });

         if (!application) {
            throw new NotFoundException('Application not found');
         }

         const validStatuses = ['screening', 'interviewing'];
         if (!validStatuses.includes(application.status)) {
            throw new BadRequestException('Application must be in screening or interviewing status to schedule interview');
         }

         // Validate scheduled date is in the future
         const scheduledDate = new Date(createInterviewDto.scheduledDate);
         if (scheduledDate <= new Date()) {
            throw new BadRequestException('Interview must be scheduled for a future date and time');
         }

         // Check for interviewer conflicts (optional business rule)
         const conflictingInterview = await this.interviewRepository.findOne({
            where: {
               interviewerId: createInterviewDto.interviewerId,
               scheduledDate: Between(
                  new Date(scheduledDate.getTime() - createInterviewDto.durationMinutes * 60000),
                  new Date(scheduledDate.getTime() + createInterviewDto.durationMinutes * 60000)
               ),
               status: 'scheduled'
            }
         });

         if (conflictingInterview) {
            throw new BadRequestException('Interviewer has a conflicting interview scheduled');
         }

         const interview = this.interviewRepository.create({
            ...createInterviewDto,
            scheduledDate,
            status: 'scheduled', // Default status
         });

         const savedInterview = await this.interviewRepository.save(interview);

         // Update application status to interviewing if not already
         if (application.status === 'screening') {
            application.status = 'interviewing';
            await this.applicationRepository.save(application);
         }

         return this.mapToResponseDto(savedInterview);
      } catch (error) {
         if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Failed to create interview');
      }
   }

   async findAll(query: GetInterviewsQueryDto): Promise<{ data: InterviewResponseDto[]; total: number }> {
      const { 
         page = 0, 
         limit = 10, 
         applicationId,
         interviewType,
         status,
         result,
         interviewerId,
         dateFrom,
         dateTo,
         sortBy = 'scheduledDate', 
         sortOrder = 'ASC' 
      } = query;

      const findOptions: FindManyOptions<InterviewEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
      };

      // Build where conditions
      const whereConditions: any = {};

      if (applicationId) {
         whereConditions.applicationId = applicationId;
      }

      if (interviewType) {
         whereConditions.interviewType = interviewType;
      }

      if (status) {
         whereConditions.status = status;
      }

      if (result) {
         whereConditions.result = result;
      }

      if (interviewerId) {
         whereConditions.interviewerId = interviewerId;
      }

      if (dateFrom && dateTo) {
         whereConditions.scheduledDate = Between(new Date(dateFrom), new Date(dateTo));
      } else if (dateFrom) {
         whereConditions.scheduledDate = Between(new Date(dateFrom), new Date('2099-12-31'));
      } else if (dateTo) {
         whereConditions.scheduledDate = Between(new Date('1900-01-01'), new Date(dateTo));
      }

      if (Object.keys(whereConditions).length > 0) {
         findOptions.where = whereConditions;
      }

      const [interviews, total] = await this.interviewRepository.findAndCount(findOptions);

      return {
         data: interviews.map(interview => this.mapToResponseDto(interview)),
         total,
      };
   }

   async findOne(id: number): Promise<InterviewResponseDto> {
      const interview = await this.interviewRepository.findOne({
         where: { interviewId: id },
      });

      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      return this.mapToResponseDto(interview);
   }

   async update(id: number, updateInterviewDto: UpdateInterviewDto): Promise<InterviewResponseDto> {
      const interview = await this.interviewRepository.findOne({
         where: { interviewId: id },
      });

      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      // Validate scheduled date if being updated
      if (updateInterviewDto.scheduledDate) {
         const scheduledDate = new Date(updateInterviewDto.scheduledDate);
         if (scheduledDate <= new Date() && interview.status === 'scheduled') {
            throw new BadRequestException('Cannot reschedule interview to a past date');
         }
      }

      // Validate actual times if provided
      if (updateInterviewDto.actualStartTime && updateInterviewDto.actualEndTime) {
         const startTime = new Date(updateInterviewDto.actualStartTime);
         const endTime = new Date(updateInterviewDto.actualEndTime);
         
         if (endTime <= startTime) {
            throw new BadRequestException('Actual end time must be after start time');
         }
      }

      // Convert date strings to Date objects
      const updateData = {
         ...updateInterviewDto,
         scheduledDate: updateInterviewDto.scheduledDate ? new Date(updateInterviewDto.scheduledDate) : undefined,
         actualStartTime: updateInterviewDto.actualStartTime ? new Date(updateInterviewDto.actualStartTime) : undefined,
         actualEndTime: updateInterviewDto.actualEndTime ? new Date(updateInterviewDto.actualEndTime) : undefined,
      };

      Object.assign(interview, updateData);
      const updatedInterview = await this.interviewRepository.save(interview);

      return this.mapToResponseDto(updatedInterview);
   }

   async remove(id: number): Promise<void> {
      const interview = await this.interviewRepository.findOne({
         where: { interviewId: id },
      });

      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      await this.interviewRepository.softRemove(interview);
   }

   async updateStatus(id: number, status: string): Promise<InterviewResponseDto> {
      const interview = await this.interviewRepository.findOne({
         where: { interviewId: id },
      });

      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
      if (!validStatuses.includes(status)) {
         throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      interview.status = status;
      const updatedInterview = await this.interviewRepository.save(interview);

      return this.mapToResponseDto(updatedInterview);
   }

   async completeInterview(id: number, completionData: {
      score?: number;
      feedback?: string;
      result?: string;
      strengths?: string;
      weaknesses?: string;
      recommendForNextRound?: boolean;
   }): Promise<InterviewResponseDto> {
      const interview = await this.interviewRepository.findOne({
         where: { interviewId: id },
      });

      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      if (interview.status !== 'in-progress' && interview.status !== 'confirmed') {
         throw new BadRequestException('Can only complete interviews that are in-progress or confirmed');
      }

      interview.status = 'completed';
      interview.actualEndTime = new Date();
      
      if (!interview.actualStartTime) {
         interview.actualStartTime = new Date(interview.scheduledDate);
      }

      Object.assign(interview, completionData);
      const updatedInterview = await this.interviewRepository.save(interview);

      return this.mapToResponseDto(updatedInterview);
   }

   async findByApplication(applicationId: number): Promise<InterviewResponseDto[]> {
      const interviews = await this.interviewRepository.find({
         where: { applicationId },
         order: { scheduledDate: 'ASC' },
      });

      return interviews.map(interview => this.mapToResponseDto(interview));
   }

   async findByInterviewer(interviewerId: number, dateFrom?: string, dateTo?: string): Promise<InterviewResponseDto[]> {
      const whereConditions: any = { interviewerId };

      if (dateFrom && dateTo) {
         whereConditions.scheduledDate = Between(new Date(dateFrom), new Date(dateTo));
      }

      const interviews = await this.interviewRepository.find({
         where: whereConditions,
         order: { scheduledDate: 'ASC' },
      });

      return interviews.map(interview => this.mapToResponseDto(interview));
   }

   async findUpcoming(interviewerId?: number): Promise<InterviewResponseDto[]> {
      const whereConditions: any = {
         status: 'scheduled',
         scheduledDate: Between(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Next 7 days
      };

      if (interviewerId) {
         whereConditions.interviewerId = interviewerId;
      }

      const interviews = await this.interviewRepository.find({
         where: whereConditions,
         order: { scheduledDate: 'ASC' },
      });

      return interviews.map(interview => this.mapToResponseDto(interview));
   }

   private mapToResponseDto(interview: InterviewEntity): InterviewResponseDto {
      const getActualDurationMinutes = (): number | undefined => {
         if (!interview.actualStartTime || !interview.actualEndTime) return undefined;
         const diffMs = interview.actualEndTime.getTime() - interview.actualStartTime.getTime();
         return Math.round(diffMs / (1000 * 60));
      };

      const getIsUpcoming = (): boolean => {
         return interview.status === 'scheduled' && new Date(interview.scheduledDate) > new Date();
      };

      const getIsOverdue = (): boolean => {
         return interview.status === 'scheduled' && new Date(interview.scheduledDate) < new Date();
      };

      const getHoursUntilInterview = (): number | undefined => {
         if (!getIsUpcoming()) return undefined;
         const now = new Date();
         const scheduled = new Date(interview.scheduledDate);
         const diffMs = scheduled.getTime() - now.getTime();
         return Math.round(diffMs / (1000 * 60 * 60));
      };

      const getFormattedScheduledTime = (): string => {
         return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
         }).format(new Date(interview.scheduledDate));
      };

      const getStatusColor = (): string => {
         const statusColors: Record<string, string> = {
            'scheduled': 'blue',
            'confirmed': 'green',
            'in-progress': 'yellow',
            'completed': 'green',
            'cancelled': 'red',
            'no-show': 'red'
         };
         return statusColors[interview.status] || 'gray';
      };

      const getResultColor = (): string => {
         const resultColors: Record<string, string> = {
            'pass': 'green',
            'strong-pass': 'green',
            'weak-pass': 'yellow',
            'fail': 'red',
            'pending': 'gray'
         };
         return interview.result ? resultColors[interview.result] || 'gray' : 'gray';
      };

      return {
         interviewId: interview.interviewId,
         applicationId: interview.applicationId,
         interviewType: interview.interviewType,
         scheduledDate: interview.scheduledDate.toISOString(),
         durationMinutes: interview.durationMinutes,
         location: interview.location,
         meetingLink: interview.meetingLink,
         status: interview.status,
         agenda: interview.agenda,
         interviewNotes: interview.interviewNotes,
         score: interview.score,
         feedback: interview.feedback,
         result: interview.result,
         strengths: interview.strengths,
         weaknesses: interview.weaknesses,
         technicalAssessment: interview.technicalAssessment,
         communicationAssessment: interview.communicationAssessment,
         culturalFitAssessment: interview.culturalFitAssessment,
         recommendForNextRound: interview.recommendForNextRound,
         questionsAsked: interview.questionsAsked,
         candidateQuestions: interview.candidateQuestions,
         actualStartTime: interview.actualStartTime?.toISOString(),
         actualEndTime: interview.actualEndTime?.toISOString(),
         cancellationReason: interview.cancellationReason,
         followUpActions: interview.followUpActions,
         additionalNotes: interview.additionalNotes,
         interviewerId: interview.interviewerId,
         secondaryInterviewerId: interview.secondaryInterviewerId,
         actualDurationMinutes: getActualDurationMinutes(),
         isUpcoming: getIsUpcoming(),
         isOverdue: getIsOverdue(),
         hoursUntilInterview: getHoursUntilInterview(),
         formattedScheduledTime: getFormattedScheduledTime(),
         statusColor: getStatusColor(),
         resultColor: getResultColor(),
         createdAt: interview.createdAt.toISOString(),
         updatedAt: interview.updatedAt.toISOString(),
      };
   }
}
