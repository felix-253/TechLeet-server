import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateInterviewDto } from './dtos/createInterviewDto';
import { UpdateInterviewDto } from './dtos/updateInterviewDto';
import { FilterInterviewDto, SortBy } from './dtos/filterInterviewDto';
import { RecruitmentEmailService } from '../email/email.service';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';

@Injectable()
export class InterviewService {
   constructor(
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      private readonly entityManager: EntityManager,
      private readonly emailService: RecruitmentEmailService,
      private readonly configService: ConfigService,
   ) {}

   async createInterview(createInterviewDto: CreateInterviewDto): Promise<InterviewEntity> {
      // Create the interview
      const interview = this.interviewRepository.create({
         ...createInterviewDto,
         scheduled_at: new Date(createInterviewDto.scheduled_at),
      });
      const savedInterview = await this.interviewRepository.save(interview);

      // Update application status to 'interviewing' if interview is scheduled
      if (savedInterview.status === 'scheduled') {
         await this.updateApplicationStatusForInterview(
            savedInterview.candidate_id,
            savedInterview.job_id,
            'interviewing'
         );
      }

      // Generate notes link
      const notesLink = this.generateNotesLink(savedInterview.interview_id);

      // Send confirmation email (async, don't wait for it)
      this.sendInterviewConfirmationEmailAsync(
         createInterviewDto.candidate_id,
         createInterviewDto.job_id,
         createInterviewDto.interviewer_ids,
         new Date(createInterviewDto.scheduled_at),
         createInterviewDto.meeting_link,
         createInterviewDto.location,
         notesLink,
      ).catch(error => {
         console.error('Failed to send interview confirmation email:', error);
      });

      return savedInterview;
   }

   /**
    * Generate notes page link for interview
    */
   private generateNotesLink(interviewId: number): string {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      return `${frontendUrl}/recruitment/interviews/${interviewId}/notes`;
   }

   /**
    * Helper method to update application status when interview is scheduled
    */
   private async updateApplicationStatusForInterview(
      candidateId: number,
      jobId: number,
      newStatus: string,
   ): Promise<void> {
      try {
         const application = await this.applicationRepository.findOne({
            where: {
               candidateId,
               jobPostingId: jobId,
            },
         });

         if (application) {
            await this.applicationRepository.update(application.applicationId, {
               status: newStatus,
            });
            console.log(
               `Updated application ${application.applicationId} status to ${newStatus} for candidate ${candidateId}, job ${jobId}`
            );
         } else {
            console.warn(
               `Application not found for candidate ${candidateId}, job ${jobId} - cannot update status`
            );
         }
      } catch (error) {
         console.error(
            `Failed to update application status for candidate ${candidateId}, job ${jobId}:`,
            error
         );
         // Don't throw error - application status update failure shouldn't break interview creation
      }
   }

   /**
    * Helper method to send interview confirmation email asynchronously
    */
   private async sendInterviewConfirmationEmailAsync(
      candidateId: number,
      jobId: number,
      interviewerIds: number[],
      scheduledAt: Date,
      meetingLink?: string,
      location?: string,
      notesLink?: string,
   ): Promise<void> {
      try {
         // Fetch candidate information
         const candidate = await this.candidateRepository.findOne({
            where: { candidateId },
         });

         if (!candidate) {
            console.error(`❌ Candidate with ID ${candidateId} not found`);
            return;
         }

         // Fetch job posting information
         const jobPosting = await this.jobPostingRepository.findOne({
            where: { jobPostingId: jobId },
         });

         if (!jobPosting) {
            console.error(`❌ Job posting with ID ${jobId} not found`);
            return;
         }

         // Fetch interviewer information from employee table (company-service)
         let interviewerNames: string[] = [];
         let interviewerEmails: string[] = [];

         if (interviewerIds && interviewerIds.length > 0) {
            const interviewers = await this.entityManager.query(
               `SELECT "employeeId", "firstName", "lastName", "email"
                FROM employee e
                WHERE e."employeeId" = ANY($1)`,
               [interviewerIds],
            );

            interviewerNames = interviewers.map(
               (interviewer: any) => `${interviewer.firstName} ${interviewer.lastName}`,
            );
            interviewerEmails = interviewers.map((interviewer: any) => interviewer.email);
         }

         // Send email to candidate (without notes link)
         await this.emailService.sendInterviewConfirmationEmail(
            candidate,
            jobPosting,
            {
               scheduledAt,
               meetingLink,
               location,
               interviewerNames,
               interviewerEmails: [], // No CC for candidate email
               notesLink: undefined, // No notes link for candidate
            },
         );

         // Send separate emails to each interviewer (with notes link)
         if (interviewerEmails && interviewerEmails.length > 0 && notesLink) {
            for (const interviewerEmail of interviewerEmails) {
               try {
                  // Create a separate email for each interviewer with notes link
                  const interviewerEmailInstance = new brevo.SendSmtpEmail();
                  const isOnline = !!meetingLink;
                  const templateId = isOnline ? 8 : 9;
                  const interviewerNamesString = interviewerNames.join(', ');
                  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                  interviewerEmailInstance.subject = `Xác nhận lịch phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
                  interviewerEmailInstance.templateId = templateId;
                  interviewerEmailInstance.to = [{ email: interviewerEmail }];

                  interviewerEmailInstance.replyTo = {
                     email: 'hr@techleet.me',
                     name: 'TechLeet Recruitment',
                  };
                  interviewerEmailInstance.sender = {
                     email: 'ldmhieu205@gmail.com',
                     name: 'TechLeet Recruitment',
                  };

                  const params: any = {
                     candidateName: `${candidate.firstName} ${candidate.lastName}`,
                     jobTitle: jobPosting.title,
                     scheduledAt: scheduledAt.toLocaleString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                     }),
                     interviewer: interviewerNamesString,
                     dueDate: dueDate.toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                     }),
                     notesLink: notesLink,
                  };

                  if (isOnline && meetingLink) {
                     params.meetingLink = meetingLink;
                  }

                  interviewerEmailInstance.params = params;

                  // Use the email service's API instance
                  const transactionalApi = new brevo.TransactionalEmailsApi();
                  const apiKey = this.configService.get<string>('SENDINBLUE_API_KEY');
                  if (apiKey) {
                     transactionalApi.setApiKey(0, apiKey);
                  }
                  await transactionalApi.sendTransacEmail(interviewerEmailInstance);
                  console.log(`✅ Interview confirmation email sent to interviewer ${interviewerEmail} with notes link`);
               } catch (error) {
                  console.error(`❌ Failed to send email to interviewer ${interviewerEmail}:`, error);
               }
            }
         }
      } catch (error) {
         console.error('Error in sendInterviewConfirmationEmailAsync:', error);
         throw error;
      }
   }

   async updateInterview(
      id: number,
      updateInterviewDto: UpdateInterviewDto,
   ): Promise<InterviewEntity> {
      const interview = await this.interviewRepository.findOne({ where: { interview_id: id } });
      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      // Track what changed for email notification
      const changedFields: string[] = [];
      const previousScheduledAt = interview.scheduled_at;
      const previousMeetingLink = interview.meeting_link;
      const previousLocation = interview.location;

      // Check for date/time changes
      if (updateInterviewDto.scheduled_at) {
         const newDate = new Date(updateInterviewDto.scheduled_at);
         if (newDate.getTime() !== interview.scheduled_at.getTime()) {
            changedFields.push('date', 'time');
         }
      }

      // Check for meeting link changes (offline to online or link change)
      if (updateInterviewDto.meeting_link !== undefined && updateInterviewDto.meeting_link !== interview.meeting_link) {
         changedFields.push('meetingLink');
         if (!previousMeetingLink && updateInterviewDto.meeting_link) {
            changedFields.push('format'); // Changed from offline to online
         }
      }

      // Check for location changes (online to offline or location change)
      if (updateInterviewDto.location !== undefined && updateInterviewDto.location !== interview.location) {
         changedFields.push('location');
         if (!previousLocation && updateInterviewDto.location) {
            changedFields.push('format'); // Changed from online to offline
         }
      }

      // Track previous status before applying updates
      const previousStatus = interview.status;

      // Apply updates
      Object.assign(interview, updateInterviewDto);
      if (updateInterviewDto.scheduled_at) {
         interview.scheduled_at = new Date(updateInterviewDto.scheduled_at);
      }

      // Auto-set status to 'scheduled' if interview is being scheduled (from pending)
      // Check if interview has all required fields for scheduling
      // Only auto-set if scheduled_at was actually updated (not just placeholder date)
      const scheduledAtUpdated = updateInterviewDto.scheduled_at !== undefined;
      const hasScheduledAt = interview.scheduled_at && interview.scheduled_at.getTime() > Date.now();
      const hasMeetingDetails = interview.meeting_link || interview.location;
      const hasInterviewers = interview.interviewer_ids && interview.interviewer_ids.length > 0;

      // If interview is pending and now has scheduling details, auto-set to 'scheduled'
      if (previousStatus === 'pending' && scheduledAtUpdated && hasScheduledAt && hasMeetingDetails && hasInterviewers) {
         interview.status = 'scheduled';
      }

      const updatedInterview = await this.interviewRepository.save(interview);

      // Update application status if interview status changed to 'scheduled'
      const newStatus = updatedInterview.status;
      if (previousStatus !== 'scheduled' && newStatus === 'scheduled') {
         await this.updateApplicationStatusForInterview(
            updatedInterview.candidate_id,
            updatedInterview.job_id,
            'interviewing'
         );
      }

      // Send update email if significant changes occurred
      if (changedFields.length > 0) {
         this.sendInterviewUpdateEmailAsync(
            updatedInterview.candidate_id,
            updatedInterview.job_id,
            updatedInterview.interviewer_ids,
            updatedInterview.scheduled_at,
            updatedInterview.meeting_link,
            updatedInterview.location,
            changedFields,
            previousScheduledAt,
         ).catch(error => {
            console.error('Failed to send interview update email:', error);
         });
      }

      return updatedInterview;
   }

   /**
    * Helper method to send interview update email asynchronously
    */
   private async sendInterviewUpdateEmailAsync(
      candidateId: number,
      jobId: number,
      interviewerIds: number[],
      scheduledAt: Date,
      meetingLink?: string,
      location?: string,
      changedFields?: string[],
      previousScheduledAt?: Date,
   ): Promise<void> {
      try {
         // Fetch candidate information
         const candidate = await this.candidateRepository.findOne({
            where: { candidateId },
         });

         if (!candidate) {
            console.error(`❌ Candidate with ID ${candidateId} not found`);
            return;
         }

         // Fetch job posting information
         const jobPosting = await this.jobPostingRepository.findOne({
            where: { jobPostingId: jobId },
         });

         if (!jobPosting) {
            console.error(`❌ Job posting with ID ${jobId} not found`);
            return;
         }

         // Fetch interviewer information
         let interviewerNames: string[] = [];
         let interviewerEmails: string[] = [];

         if (interviewerIds && interviewerIds.length > 0) {
            const interviewers = await this.entityManager.query(
               `SELECT "employeeId", "firstName", "lastName", "email"
                FROM employee e
                WHERE e."employeeId" = ANY($1)`,
               [interviewerIds],
            );

            interviewerNames = interviewers.map(
               (interviewer: any) => `${interviewer.firstName} ${interviewer.lastName}`,
            );
            interviewerEmails = interviewers.map((interviewer: any) => interviewer.email);
         }

         // Send interview update email
         await this.emailService.sendInterviewUpdateEmail(
            candidate,
            jobPosting,
            {
               scheduledAt,
               meetingLink,
               location,
               interviewerNames,
               interviewerEmails,
               changedFields,
               previousScheduledAt,
               changeReason: 'Lịch phỏng vấn đã được điều chỉnh theo yêu cầu.',
            },
         );
      } catch (error) {
         console.error('Error in sendInterviewUpdateEmailAsync:', error);
         throw error;
      }
   }

   async softDeleteInterview(id: number): Promise<void> {
      const result = await this.interviewRepository.softDelete(id);
      if (result.affected === 0) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }
   }

   async getInterviewById(id: number): Promise<any> {
      const row = await this.interviewRepository
         .createQueryBuilder('i')
         .leftJoin('candidate', 'c', 'i.candidate_id = c.candidateId')
         .leftJoin('job_posting', 'j', 'i.job_id = j.jobPostingId')
         .select([
            'i.interview_id as i_id',
            'i.scheduled_at as i_scheduled_at',
            'i.duration_minutes as i_duration',
            'i.meeting_link as i_meeting_link',
            'i.location as i_location',
            'i.status as i_status',
            'i.interviewer_ids as i_interviewer_ids',

            'c.candidateId as c_id',
            'c.firstName as c_first_name',
            'c.lastName as c_last_name',

            'j.jobPostingId as j_id',
            'j.title as j_title',
         ])
         .where('i.interview_id = :id', { id })
         .getRawOne();

      if (!row) return null;

      let interviewers = [];
      if (row.i_interviewer_ids && row.i_interviewer_ids.length > 0) {
         interviewers = await this.entityManager.query(
            `SELECT "employeeId", "firstName", "lastName"
     FROM employee e
     WHERE e."employeeId" = ANY($1)`,
            [row.i_interviewer_ids],
         );
      }

      // build object nested
      const interview = {
         interview_id: row.i_id,
         scheduled_at: row.i_scheduled_at,
         duration_minutes: row.i_duration,
         meeting_link: row.i_meeting_link,
         location: row.i_location,
         status: row.i_status,

         candidate: {
            candidate_id: row.c_id,
            first_name: row.c_first_name,
            last_name: row.c_last_name,
         },

         job: {
            job_id: row.j_id,
            title: row.j_title,
         },

         interviewers, // array object từ EmployeeEntity
      };

      return interview;
   }

   async getInterviewsByCandidateId(
      candidateId: number,
      sortBy: SortBy = SortBy.SCHEDULED_AT,
   ): Promise<InterviewEntity[]> {
      const queryBuilder = this.interviewRepository
         .createQueryBuilder('interview')
         .where('interview.candidate_id = :candidateId', { candidateId });

      if (sortBy === SortBy.SCORE) {
         queryBuilder.orderBy('interview.scores', 'DESC');
      } else {
         queryBuilder.orderBy('interview.scheduled_at', 'ASC');
      }

      return queryBuilder.getMany();
   }

   async getInterviewsByJobId(
      jobId: number,
      sortBy: SortBy = SortBy.SCHEDULED_AT,
   ): Promise<InterviewEntity[]> {
      const queryBuilder = this.interviewRepository
         .createQueryBuilder('interview')
         .where('interview.job_id = :jobId', { jobId });

      if (sortBy === SortBy.SCORE) {
         queryBuilder.orderBy('interview.scores', 'DESC');
      } else {
         queryBuilder.orderBy('interview.scheduled_at', 'ASC');
      }

      return queryBuilder.getMany();
   }

   async getAllInterviewsSortedByScheduledAt(): Promise<InterviewEntity[]> {
      return this.interviewRepository.find({
         order: { scheduled_at: 'ASC' },
      });
   }

   async getInterviewsByStatus(status: string): Promise<InterviewEntity[]> {
      return this.interviewRepository.find({
         where: { status },
         order: { scheduled_at: 'ASC' },
      });
   }

   async filterInterviews(
      filterDto: FilterInterviewDto,
   ): Promise<{ data: InterviewEntity[]; total: number }> {
      const queryBuilder = this.interviewRepository.createQueryBuilder('interview');

      // Apply filters
      if (filterDto.id) {
         queryBuilder.andWhere('interview.interview_id = :id', { id: filterDto.id });
      }
      if (filterDto.candidate_id) {
         queryBuilder.andWhere('interview.candidate_id = :candidateId', {
            candidateId: filterDto.candidate_id,
         });
      }
      if (filterDto.job_id) {
         queryBuilder.andWhere('interview.job_id = :jobId', { jobId: filterDto.job_id });
      }
      if (filterDto.status) {
         queryBuilder.andWhere('interview.status = :status', { status: filterDto.status });
      }

      // Apply sorting
      if (filterDto.sort_by === SortBy.SCORE) {
         queryBuilder.orderBy('interview.scores', filterDto.sort_order);
      } else {
         queryBuilder.orderBy(`interview.${filterDto.sort_by}`, filterDto.sort_order);
      }

      // Apply pagination
      const skip = ((filterDto.page as number) - 1) * (filterDto.limit as number);
      queryBuilder.skip(skip).take(filterDto.limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      return { data, total };
   }

   async updateInterviewNotes(id: number, notes: string): Promise<InterviewEntity> {
      const interview = await this.interviewRepository.findOne({ where: { interview_id: id } });
      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      interview.notes = notes;
      return await this.interviewRepository.save(interview);
   }

   async getInterviewNotesData(id: number): Promise<any> {
      const interview = await this.interviewRepository.findOne({
         where: { interview_id: id },
      });

      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      // Fetch application data
      const application = await this.applicationRepository.findOne({
         where: {
            candidateId: interview.candidate_id,
            jobPostingId: interview.job_id,
         },
      });

      if (!application) {
         throw new NotFoundException(
            `Application not found for candidate ${interview.candidate_id}, job ${interview.job_id}`,
         );
      }

      // Fetch candidate data
      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: interview.candidate_id },
      });

      if (!candidate) {
         throw new NotFoundException(`Candidate with ID ${interview.candidate_id} not found`);
      }

      // Fetch job posting data
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: interview.job_id },
      });

      if (!jobPosting) {
         throw new NotFoundException(`Job posting with ID ${interview.job_id} not found`);
      }

      // Fetch interviewer data
      let interviewers = [];
      if (interview.interviewer_ids && interview.interviewer_ids.length > 0) {
         interviewers = await this.entityManager.query(
            `SELECT "employeeId", "firstName", "lastName", "email"
             FROM employee e
             WHERE e."employeeId" = ANY($1)`,
            [interview.interviewer_ids],
         );
      }

      return {
         interview: {
            interview_id: interview.interview_id,
            scheduled_at: interview.scheduled_at,
            duration_minutes: interview.duration_minutes,
            meeting_link: interview.meeting_link,
            location: interview.location,
            status: interview.status,
            notes: interview.notes,
         },
         application: {
            application_id: application.applicationId,
            resume_url: application.resumeUrl,
            screening_score: application.screeningScore,
            screening_status: application.screeningStatus,
         },
         candidate: {
            candidate_id: candidate.candidateId,
            first_name: candidate.firstName,
            last_name: candidate.lastName,
            email: candidate.email,
            phone_number: candidate.phoneNumber,
            years_of_experience: candidate.yearsOfExperience,
            skills: candidate.skills,
            summary: candidate.summary,
         },
         job: {
            job_id: jobPosting.jobPostingId,
            title: jobPosting.title,
         },
         interviewers,
      };
   }
}
