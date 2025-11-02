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
      application: ApplicationEntity,
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         sendSmtpEmail.subject = `Cảm ơn bạn đã ứng tuyển vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 7; // Create this template in Brevo
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };
         sendSmtpEmail.headers = {
            'X-Application-Id': application.applicationId.toString(),
            'X-Candidate-Id': candidate.candidateId.toString(),
         };

         sendSmtpEmail.params = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            companyName: 'TechLeet',
            applicationId: application.applicationId,
            applicationDate: new Date().toLocaleDateString('vi-VN'),
            nextSteps:
               'Chúng tôi sẽ xem xét hồ sơ của bạn và liên hệ trong vòng 3-5 ngày làm việc.',
            contactEmail: 'hr@techleet.me',
            dashboardUrl: `${this.configService.get<string>('FRONTEND_URL')}/applications?email=${encodeURIComponent(candidate.email)}`,
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(
            `✅ Thank you email sent to ${candidate.email} for application ${application.applicationId}`,
         );
      } catch (error) {
         console.error(`❌ Failed to send thank you email to ${candidate.email}:`, error);
         // Don't throw error - email failure shouldn't break the application process
      }
   }

   /**
    * Send examination email to candidate after CV screening passes
    */
   async sendExaminationEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      examinationId: number,
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();
         const candidatePortalUrl = this.configService.get<string>('FRONTEND_CANDIDATE_URL', 'http://localhost:8080');
         const examinationLink = `${candidatePortalUrl}/exam/${examinationId}`;

         sendSmtpEmail.subject = `Bài kiểm tra cho vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 11;
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };

         sendSmtpEmail.params = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            examinationLink: examinationLink,
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(
            `✅ Examination email sent to ${candidate.email} for examination ${examinationId}`,
         );
      } catch (error) {
         console.error(`❌ Failed to send examination email to ${candidate.email}:`, error);
         // Don't throw error - email failure shouldn't break the process
      }
   }

   /**
    * Send screening rejection email to candidate
    */
   async sendScreeningRejectionEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      application: ApplicationEntity,
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         sendSmtpEmail.subject = `Cập nhật về đơn ứng tuyển của bạn - TechLeet`;
         sendSmtpEmail.templateId = 10;
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };
         sendSmtpEmail.headers = {
            'X-Application-Id': application.applicationId.toString(),
            'X-Candidate-Id': candidate.candidateId.toString(),
         };

         sendSmtpEmail.params = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            companyName: 'TechLeet',
            applicationId: application.applicationId,
            applicationDate: application.appliedDate
               ? new Date(application.appliedDate).toLocaleDateString('vi-VN')
               : new Date().toLocaleDateString('vi-VN'),
            nextSteps:
               'Rất tiếc, chúng tôi đã xem xét kỹ lưỡng hồ sơ của bạn nhưng hiện tại không phù hợp với vị trí này. Chúng tôi cảm ơn sự quan tâm của bạn và khuyến khích bạn tiếp tục theo dõi các vị trí khác tại TechLeet.',
            contactEmail: 'hr@techleet.me',
            dashboardUrl: `${this.configService.get<string>('FRONTEND_URL')}/jobs`,
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(
            `✅ Screening rejection email sent to ${candidate.email} for application ${application.applicationId}`,
         );
      } catch (error) {
         console.error(`❌ Failed to send rejection email to ${candidate.email}:`, error);
         // Don't throw error - email failure shouldn't break the screening process
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
      message?: string,
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         const statusMessages = {
            reviewing: 'đang được xem xét',
            interview: 'đã qua vòng sàng lọc hồ sơ',
            accepted: 'đã được chấp nhận',
            rejected: 'rất tiếc không phù hợp lúc này',
         };

         sendSmtpEmail.subject = `Cập nhật trạng thái ứng tuyển ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 7; // Create this template in Brevo
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
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
    * Send interview invitation email (DEPRECATED - use sendInterviewConfirmationEmail instead)
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
      },
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         sendSmtpEmail.subject = `Mời phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = 8; // Create this template in Brevo
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
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
            instructions:
               interviewDetails.instructions ||
               'Vui lòng chuẩn bị CV và các câu hỏi bạn muốn tìm hiểu về công ty.',
            contactEmail: 'hr@techleet.me',
         };

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(`✅ Interview invitation sent to ${candidate.email}`);
      } catch (error) {
         console.error(`❌ Failed to send interview invitation to ${candidate.email}:`, error);
      }
   }

   /**
    * Send interview confirmation email to candidate and CC to interviewers
    * Uses template #8 for online interviews and template #9 for onsite interviews
    */
   async sendInterviewConfirmationEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      interviewDetails: {
         scheduledAt: Date;
         meetingLink?: string;
         location?: string;
         interviewerNames: string[]; // Array of interviewer names
         interviewerEmails: string[]; // Array of interviewer emails for CC
         dueDate?: Date; // Deadline to respond
         notesLink?: string; // Optional notes page link for interviewers
      },
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         // Determine if it's an online or onsite interview
         const isOnline = !!interviewDetails.meetingLink;
         const templateId = isOnline ? 8 : 9;

         // Format interviewer names
         const interviewerNamesString = interviewDetails.interviewerNames.join(', ');

         // Calculate due date if not provided (3 days from now)
         const dueDate = interviewDetails.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

         sendSmtpEmail.subject = `Xác nhận lịch phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = templateId;

         // Main recipient: candidate
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];

         // CC: all interviewers
         if (interviewDetails.interviewerEmails && interviewDetails.interviewerEmails.length > 0) {
            sendSmtpEmail.cc = interviewDetails.interviewerEmails.map((email) => ({ email }));
         }

         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet Recruitment',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };

         // Template parameters
         const baseParams = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            scheduledAt: interviewDetails.scheduledAt.toLocaleString('vi-VN', {
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
         };

         // Add meeting link for online interviews (template #8)
         // Add notes link if provided (for interviewers)
         const params: any = { ...baseParams };
         if (isOnline && interviewDetails.meetingLink) {
            params.meetingLink = interviewDetails.meetingLink;
         }
         if (interviewDetails.notesLink) {
            params.notesLink = interviewDetails.notesLink;
         }
         sendSmtpEmail.params = params;

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(
            `✅ Interview confirmation email sent to ${candidate.email} (CC: ${interviewDetails.interviewerEmails.join(', ')})`,
         );
         console.log(`   Template: ${isOnline ? '#8 (Online)' : '#9 (Onsite)'}`);
      } catch (error) {
         console.error(
            `❌ Failed to send interview confirmation email to ${candidate.email}:`,
            error,
         );
         // Don't throw error - email failure shouldn't break the interview creation process
      }
   }

   /**
    * Send interview confirmation email to a single interviewer (with notes link)
    * Used when sending separate emails to each interviewer
    */
   async sendInterviewConfirmationEmailToInterviewer(
      recipientEmail: string,
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      interviewDetails: {
         scheduledAt: Date;
         meetingLink?: string;
         location?: string;
         interviewerNames: string[];
         notesLink: string;
      },
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();
         const isOnline = !!interviewDetails.meetingLink;
         const templateId = isOnline ? 8 : 9;
         const interviewerNamesString = interviewDetails.interviewerNames.join(', ');
         const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

         sendSmtpEmail.subject = `Xác nhận lịch phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = templateId;
         sendSmtpEmail.to = [{ email: recipientEmail }];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };

         const params: any = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            scheduledAt: interviewDetails.scheduledAt.toLocaleString('vi-VN', {
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
            notesLink: interviewDetails.notesLink,
         };

         if (isOnline && interviewDetails.meetingLink) {
            params.meetingLink = interviewDetails.meetingLink;
         }

         sendSmtpEmail.params = params;
         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(`✅ Interview confirmation email sent to interviewer ${recipientEmail} with notes link`);
      } catch (error) {
         console.error(`❌ Failed to send interview confirmation email to interviewer ${recipientEmail}:`, error);
         throw error;
      }
   }

   /**
    * Send interview update email to a single interviewer (with notes link)
    * Used when sending separate emails to each interviewer
    */
   async sendInterviewUpdateEmailToInterviewer(
      recipientEmail: string,
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      interviewDetails: {
         scheduledAt: Date;
         meetingLink?: string;
         location?: string;
         interviewerNames: string[];
         changedFields?: string[];
         previousScheduledAt?: Date;
         changeDescription?: string;
         notesLink: string;
      },
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();
         const isOnline = !!interviewDetails.meetingLink;
         const templateId = isOnline ? 8 : 9;
         const interviewerNamesString = interviewDetails.interviewerNames.join(', ');
         const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

         // Build change description if not provided
         let changeDescription = interviewDetails.changeDescription;
         if (!changeDescription && interviewDetails.changedFields && interviewDetails.changedFields.length > 0) {
            const fieldNames: Record<string, string> = {
               date: 'Ngày phỏng vấn',
               time: 'Thời gian',
               location: 'Địa điểm',
               meetingLink: 'Link meeting',
               format: 'Hình thức phỏng vấn',
            };
            
            const changedFieldsText = interviewDetails.changedFields
               .map((field) => fieldNames[field] || field)
               .join(', ');
            
            changeDescription = `Lịch phỏng vấn đã được cập nhật với những thay đổi sau:\n- ${changedFieldsText}`;
         }

         if (interviewDetails.previousScheduledAt && changeDescription) {
            changeDescription += `\n\nThời gian cũ: ${interviewDetails.previousScheduledAt.toLocaleString('vi-VN', {
               weekday: 'long',
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit',
            })}`;
         }

         sendSmtpEmail.subject = `[CẬP NHẬT] Xác nhận lịch phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = templateId;
         sendSmtpEmail.to = [{ email: recipientEmail }];
         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet HR Team',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };

         const params: any = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            scheduledAt: interviewDetails.scheduledAt.toLocaleString('vi-VN', {
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
            notesLink: interviewDetails.notesLink,
            changeDescription: changeDescription || '',
         };

         if (isOnline && interviewDetails.meetingLink) {
            params.meetingLink = interviewDetails.meetingLink;
         }

         sendSmtpEmail.params = params;
         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(`✅ Interview update email sent to interviewer ${recipientEmail} with notes link`);
      } catch (error) {
         console.error(`❌ Failed to send interview update email to interviewer ${recipientEmail}:`, error);
         throw error;
      }
   }

   /**
    * Send interview update/reschedule email to candidate and CC to interviewers
    * Used when interview details are changed (date, time, location, meeting link)
    */
   async sendInterviewUpdateEmail(
      candidate: CandidateEntity,
      jobPosting: JobPostingEntity,
      interviewDetails: {
         scheduledAt: Date;
         meetingLink?: string;
         location?: string;
         interviewerNames: string[];
         interviewerEmails: string[];
         changeReason?: string;
         previousScheduledAt?: Date;
         changedFields?: string[]; // e.g., ['date', 'time', 'location', 'meetingLink']
         notesLink?: string;
      },
   ): Promise<void> {
      try {
         const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

         // Determine if it's an online or onsite interview
         const isOnline = !!interviewDetails.meetingLink;
         const templateId = isOnline ? 8 : 9;

         // Format interviewer names
         const interviewerNamesString = interviewDetails.interviewerNames.join(', ');

         // Build change description
         let changeDescription = 'Lịch phỏng vấn của bạn đã được cập nhật với những thay đổi sau:';
         if (interviewDetails.changedFields && interviewDetails.changedFields.length > 0) {
            const fieldNames = {
               date: 'Ngày phỏng vấn',
               time: 'Thời gian',
               location: 'Địa điểm',
               meetingLink: 'Link meeting',
               format: 'Hình thức phỏng vấn',
            };
            
            const changedFieldsText = interviewDetails.changedFields
               .map((field) => fieldNames[field] || field)
               .join(', ');
            
            changeDescription += `\n- ${changedFieldsText}`;
         }

         if (interviewDetails.previousScheduledAt) {
            changeDescription += `\n\nThời gian cũ: ${interviewDetails.previousScheduledAt.toLocaleString('vi-VN', {
               weekday: 'long',
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit',
            })}`;
         }

         if (interviewDetails.changeReason) {
            changeDescription += `\n\nLý do: ${interviewDetails.changeReason}`;
         }

         sendSmtpEmail.subject = `[CẬP NHẬT] Lịch phỏng vấn vị trí ${jobPosting.title} - TechLeet`;
         sendSmtpEmail.templateId = templateId;

         // Main recipient: candidate
         sendSmtpEmail.to = [
            {
               email: candidate.email,
               name: `${candidate.firstName} ${candidate.lastName}`,
            },
         ];

         // CC: all interviewers
         if (interviewDetails.interviewerEmails && interviewDetails.interviewerEmails.length > 0) {
            sendSmtpEmail.cc = interviewDetails.interviewerEmails.map((email) => ({ email }));
         }

         sendSmtpEmail.replyTo = {
            email: 'hr@techleet.me',
            name: 'TechLeet Recruitment',
         };
         sendSmtpEmail.sender = {
            email: 'ldmhieu205@gmail.com',
            name: 'TechLeet Recruitment',
         };

         // Template parameters - reusing the same templates but with updated messaging
         const baseParams = {
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobPosting.title,
            scheduledAt: interviewDetails.scheduledAt.toLocaleString('vi-VN', {
               weekday: 'long',
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit',
            }),
            interviewer: interviewerNamesString,
            changeDescription, // Additional context about changes
            isUpdate: true, // Flag to indicate this is an update email
         };

         // Add meeting link for online interviews
         if (isOnline && interviewDetails.meetingLink) {
            sendSmtpEmail.params = {
               ...baseParams,
               meetingLink: interviewDetails.meetingLink,
            };
         } else {
            sendSmtpEmail.params = baseParams;
         }

         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
         console.log(
            `✅ Interview update email sent to ${candidate.email} (CC: ${interviewDetails.interviewerEmails.join(', ')})`,
         );
         console.log(`   Changes: ${interviewDetails.changedFields?.join(', ') || 'general update'}`);
      } catch (error) {
         console.error(
            `❌ Failed to send interview update email to ${candidate.email}:`,
            error,
         );
         // Don't throw error - email failure shouldn't break the interview update process
      }
   }
}
