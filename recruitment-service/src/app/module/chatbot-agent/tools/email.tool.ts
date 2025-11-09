import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';
import { RecruitmentEmailService } from '../../email/email.service';

@Injectable()
export class EmailTool extends BaseTool {
  name = 'email_tool';
  description = 'Send emails to candidates, interviewers, or other recipients. Can send application status updates, interview confirmations, offers, rejections, and custom emails.';
  
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['send', 'send_custom', 'send_status_update', 'send_interview_confirmation', 'send_offer', 'send_rejection'],
        description: 'Action to perform: send (generic email), send_custom (custom email with template), send_status_update (application status update), send_interview_confirmation (interview confirmation), send_offer (job offer), send_rejection (rejection email)'
      },
      recipientEmail: {
        type: 'string',
        description: 'Email address of the recipient (required for send and send_custom)'
      },
      candidateId: {
        type: 'number',
        description: 'Candidate ID (required for send_status_update, send_offer, send_rejection)'
      },
      applicationId: {
        type: 'number',
        description: 'Application ID (required for send_status_update, send_offer, send_rejection)'
      },
      interviewId: {
        type: 'number',
        description: 'Interview ID (required for send_interview_confirmation)'
      },
      subject: {
        type: 'string',
        description: 'Email subject (required for send and send_custom)'
      },
      body: {
        type: 'string',
        description: 'Email body/content (required for send)'
      },
      templateId: {
        type: 'number',
        description: 'Brevo template ID (optional for send_custom, required for some actions)'
      },
      cc: {
        type: 'array',
        items: { type: 'string' },
        description: 'CC email addresses (optional)'
      },
      bcc: {
        type: 'array',
        items: { type: 'string' },
        description: 'BCC email addresses (optional)'
      },
      newStatus: {
        type: 'string',
        description: 'New application status (required for send_status_update)'
      },
      interviewerEmails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Interviewer email addresses for CC (optional for send_interview_confirmation)'
      },
      startDate: {
        type: 'string',
        description: 'Job start date (required for send_offer)'
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>,
    @InjectRepository(InterviewEntity)
    private readonly interviewRepository: Repository<InterviewEntity>,
    private readonly emailService: RecruitmentEmailService
  ) {
    super();
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
    }

    try {
      switch (params.action) {
        case 'send':
          return await this.sendEmail(params, context);
        case 'send_custom':
          return await this.sendCustomEmail(params, context);
        case 'send_status_update':
          return await this.sendStatusUpdateEmail(params, context);
        case 'send_interview_confirmation':
          return await this.sendInterviewConfirmationEmail(params, context);
        case 'send_offer':
          return await this.sendOfferEmail(params, context);
        case 'send_rejection':
          return await this.sendRejectionEmail(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async sendEmail(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.recipientEmail || !params.subject || !params.body) {
      return this.createErrorResult('Missing required fields', 'recipientEmail, subject, and body are required for send action');
    }

    try {
      const sendSmtpEmail = {
        to: [{ email: params.recipientEmail }],
        subject: params.subject,
        htmlContent: params.body,
        cc: params.cc?.map((email: string) => ({ email })),
        bcc: params.bcc?.map((email: string) => ({ email })),
        sender: {
          email: 'ldmhieu205@gmail.com',
          name: 'TechLeet Recruitment'
        },
        replyTo: {
          email: 'hr@techleet.me',
          name: 'TechLeet HR Team'
        }
      };

      await (this.emailService as any).apiInstance.sendTransacEmail(sendSmtpEmail);

      return this.createSuccessResult(
        { recipientEmail: params.recipientEmail, subject: params.subject },
        `Email sent successfully to ${params.recipientEmail}`
      );
    } catch (error) {
      return this.createErrorResult('Email send failed', error.message);
    }
  }

  private async sendCustomEmail(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.recipientEmail || !params.subject) {
      return this.createErrorResult('Missing required fields', 'recipientEmail and subject are required for send_custom action');
    }

    if (!params.templateId) {
      return this.createErrorResult('Missing template', 'templateId is required for send_custom action');
    }

    try {
      const sendSmtpEmail = {
        to: [{ email: params.recipientEmail }],
        subject: params.subject,
        templateId: params.templateId,
        cc: params.cc?.map((email: string) => ({ email })),
        bcc: params.bcc?.map((email: string) => ({ email })),
        sender: {
          email: 'ldmhieu205@gmail.com',
          name: 'TechLeet Recruitment'
        },
        replyTo: {
          email: 'hr@techleet.me',
          name: 'TechLeet HR Team'
        }
      };

      await (this.emailService as any).apiInstance.sendTransacEmail(sendSmtpEmail);

      return this.createSuccessResult(
        { recipientEmail: params.recipientEmail, subject: params.subject, templateId: params.templateId },
        `Custom email sent successfully to ${params.recipientEmail} using template ${params.templateId}`
      );
    } catch (error) {
      return this.createErrorResult('Email send failed', error.message);
    }
  }

  private async sendStatusUpdateEmail(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.applicationId || !params.newStatus) {
      return this.createErrorResult('Missing required fields', 'applicationId and newStatus are required for send_status_update action');
    }

    try {
      const application = await this.applicationRepository.findOne({
        where: { applicationId: params.applicationId }
      });

      if (!application) {
        return this.createErrorResult('Application not found', `Application with ID ${params.applicationId} not found`);
      }

      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: application.candidateId }
      });

      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: application.jobPostingId }
      });

      if (!candidate || !jobPosting) {
        return this.createErrorResult('Related entity not found', 'Candidate or job posting not found');
      }

      await this.emailService.sendApplicationStatusUpdateEmail(
        candidate,
        jobPosting,
        application,
        params.newStatus
      );

      return this.createSuccessResult(
        { applicationId: params.applicationId, newStatus: params.newStatus, recipientEmail: candidate.email },
        `Status update email sent successfully to ${candidate.email}`
      );
    } catch (error) {
      return this.createErrorResult('Email send failed', error.message);
    }
  }

  private async sendInterviewConfirmationEmail(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.interviewId) {
      return this.createErrorResult('Missing required fields', 'interviewId is required for send_interview_confirmation action');
    }

    try {
      const interview = await this.interviewRepository.findOne({
        where: { interview_id: params.interviewId }
      });

      if (!interview) {
        return this.createErrorResult('Interview not found', `Interview with ID ${params.interviewId} not found`);
      }

      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: interview.candidate_id }
      });

      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: interview.job_id }
      });

      if (!candidate || !jobPosting) {
        return this.createErrorResult('Related entity not found', 'Candidate or job posting not found');
      }

      const interviewerNames: string[] = [];
      const interviewerEmails: string[] = params.interviewerEmails || [];

      await this.emailService.sendInterviewConfirmationEmail(
        candidate,
        jobPosting,
        {
          scheduledAt: interview.scheduled_at,
          meetingLink: interview.meeting_link,
          location: interview.location,
          interviewerNames,
          interviewerEmails,
          notesLink: interview.notes || undefined
        }
      );

      return this.createSuccessResult(
        { interviewId: params.interviewId, recipientEmail: candidate.email },
        `Interview confirmation email sent successfully to ${candidate.email}`
      );
    } catch (error) {
      return this.createErrorResult('Email send failed', error.message);
    }
  }

  private async sendOfferEmail(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.applicationId || !params.startDate) {
      return this.createErrorResult('Missing required fields', 'applicationId and startDate are required for send_offer action');
    }

    try {
      const application = await this.applicationRepository.findOne({
        where: { applicationId: params.applicationId }
      });

      if (!application) {
        return this.createErrorResult('Application not found', `Application with ID ${params.applicationId} not found`);
      }

      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: application.candidateId }
      });

      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: application.jobPostingId }
      });

      if (!candidate || !jobPosting) {
        return this.createErrorResult('Related entity not found', 'Candidate or job posting not found');
      }

      await this.emailService.sendOfferEmail(
        candidate,
        jobPosting,
        application,
        params.startDate
      );

      return this.createSuccessResult(
        { applicationId: params.applicationId, recipientEmail: candidate.email, startDate: params.startDate },
        `Offer email sent successfully to ${candidate.email}`
      );
    } catch (error) {
      return this.createErrorResult('Email send failed', error.message);
    }
  }

  private async sendRejectionEmail(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.applicationId) {
      return this.createErrorResult('Missing required fields', 'applicationId is required for send_rejection action');
    }

    try {
      const application = await this.applicationRepository.findOne({
        where: { applicationId: params.applicationId }
      });

      if (!application) {
        return this.createErrorResult('Application not found', `Application with ID ${params.applicationId} not found`);
      }

      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: application.candidateId }
      });

      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: application.jobPostingId }
      });

      if (!candidate || !jobPosting) {
        return this.createErrorResult('Related entity not found', 'Candidate or job posting not found');
      }

      if (application.status === 'screening_passed' || application.status === 'interview') {
        await this.emailService.sendInterviewRejectionEmail(
          candidate,
          jobPosting,
          application
        );
      } else {
        await this.emailService.sendScreeningRejectionEmail(
          candidate,
          jobPosting,
          application
        );
      }

      return this.createSuccessResult(
        { applicationId: params.applicationId, recipientEmail: candidate.email },
        `Rejection email sent successfully to ${candidate.email}`
      );
    } catch (error) {
      return this.createErrorResult('Email send failed', error.message);
    }
  }
}

