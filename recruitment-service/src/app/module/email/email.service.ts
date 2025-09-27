import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';
import { TransactionalEmailsApi } from '@getbrevo/brevo';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';

@Injectable()
export class RecruitmentEmailService {
   private readonly apiInstance: TransactionalEmailsApi;

   constructor(private readonly configService: ConfigService) {
      this.apiInstance = new brevo.TransactionalEmailsApi();
      const apiKey = this.configService.get<string>('SENDINBLUE_API_KEY');
      if (apiKey) {
         this.apiInstance.setApiKey(0, apiKey);
      }
   }

   /**
    * Send thank you email to candidate after application submission
    */
   async sendApplicationThankYouEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      application: ApplicationEntity
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         sendSmtpEmail.subject = `Cảm ơn bạn đã ứng tuyển vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 6; // Create this template in Brevo
         sendSmtpEmail.to = [
            { 
               email: candidate.email, 
               name: `${candidate.firstName} ${candidate.lastName}` 
            },
         ];
         sendSmtpEmail.replyTo = { 
            email: 'hr@techleet.me', 
            name: 'TechLeet HR Team' 
         };
         sendSmtpEmail.sender = { 
            email: 'noreply@techleet.me', 
            name: 'TechLeet Recruitment' 
         };
         sendSmtpEmail.headers = { 
            'X-Application-Id': application.applicationId.toString(),
            'X-Candidate-Id': candidate.candidateId.toString()
         };

         sendSmtpEmail.params = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            companyName: 'TechLeet',
            applicationId: application.applicationId,
            applicationDate: new Date().toLocaleDateString('vi-VN'),
            nextSteps: 'Chúng tôi sẽ xem xét hồ sơ của bạn và liên hệ trong vòng 3-5 ngày làm việc.',
            contactEmail: 'hr@techleet.me',
            dashboardUrl: `${this.configService.get<string>('FRONTEND_URL')}/application/${application.applicationId}`,
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(`✅ Thank you email sent to ${candidate.email} for application ${application.applicationId}`);
      } catch (error) {
         console.error(`❌ Failed to send thank you email to ${candidate.email}:`, error);
         // Don't throw error - email failure shouldn't break the application process
      }
   }

   /**
    * Send application status update email
    */
   async sendApplicationStatusUpdateEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      application: ApplicationEntity,
      newStatus: string,
      message?: string
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         const statusMessages = {
            'reviewing': 'đang được xem xét',
            'interview': 'đã qua vòng sàng lọc hồ sơ',
            'accepted': 'đã được chấp nhận',
            'rejected': 'rất tiếc không phù hợp lúc này',
         };

         sendSmtpEmail.subject = `Cập nhật trạng thái ứng tuyển ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 7; // Create this template in Brevo
         sendSmtpEmail.to = [
            { 
               email: candidate.email, 
               name: `${candidate.firstName} ${candidate.lastName}` 
            },
         ];
         sendSmtpEmail.replyTo = { 
            email: 'hr@techleet.me', 
            name: 'TechLeet HR Team' 
         };
         sendSmtpEmail.sender = { 
            email: 'noreply@techleet.me', 
            name: 'TechLeet Recruitment' 
         };

         sendSmtpEmail.params = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            companyName: 'TechLeet',
            applicationId: application.applicationId,
            status: newStatus,
            statusMessage: statusMessages[newStatus] || newStatus,
            customMessage: message || '',
            contactEmail: 'hr@techleet.me',
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(`✅ Status update email sent to ${candidate.email} - Status: ${newStatus}`);
      } catch (error) {
         console.error(`❌ Failed to send status update email to ${candidate.email}:`, error);
      }
   }

   /**
    * Send interview invitation email
    */
   async sendInterviewInvitationEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      interviewDetails: {
         date: Date;
         time: string;
         location?: string;
         meetingLink?: string;
         interviewer: string;
         instructions?: string;
      }
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         sendSmtpEmail.subject = `Mời phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 8; // Create this template in Brevo
         sendSmtpEmail.to = [
            { 
               email: candidate.email, 
               name: `${candidate.firstName} ${candidate.lastName}` 
            },
         ];
         sendSmtpEmail.replyTo = { 
            email: 'hr@techleet.me', 
            name: 'TechLeet HR Team' 
         };
         sendSmtpEmail.sender = { 
            email: 'hr@techleet.me', 
            name: 'TechLeet HR Team' 
         };

         sendSmtpEmail.params = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            companyName: 'TechLeet',
            interviewDate: interviewDetails.date.toLocaleDateString('vi-VN'),
            interviewTime: interviewDetails.time,
            location: interviewDetails.location || 'Online',
            meetingLink: interviewDetails.meetingLink || '',
            interviewer: interviewDetails.interviewer,
            instructions: interviewDetails.instructions || 'Vui lòng chuẩn bị CV và các câu hỏi bạn muốn tìm hiểu về công ty.',
            contactEmail: 'hr@techleet.me',
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(`✅ Interview invitation sent to ${candidate.email}`);
      } catch (error) {
         console.error(`❌ Failed to send interview invitation to ${candidate.email}:`, error);
      }
   }
}
