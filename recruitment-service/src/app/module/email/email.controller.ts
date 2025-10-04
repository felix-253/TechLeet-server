import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RecruitmentEmailService } from './email.service';

class TestEmailDto {
  testEmail: string;
  emailType?: string;
  testData?: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    applicationId: number;
    applicationDate: string;
    nextSteps: string;
    contactEmail: string;
    dashboardUrl: string;
  };
}

@ApiTags('Email Testing')
@Controller('test-email')
export class EmailController {
  constructor(private readonly emailService: RecruitmentEmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Send test email', 
    description: 'Send a test email using Brevo to verify email configuration' 
  })
  @ApiBody({ type: TestEmailDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Test email sent successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        emailSent: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request data' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Email sending failed' 
  })
  async sendTestEmail(@Body() testEmailDto: TestEmailDto) {
    try {
      const { testEmail, emailType = 'thank-you', testData } = testEmailDto;

      if (!testEmail) {
        throw new Error('Test email is required');
      }

      console.log(`🧪 Sending ${emailType} test email to: ${testEmail}`);

      // Create mock data for testing
      const mockCandidate = {
        candidateId: 99999,
        email: testEmail,
        firstName: testData?.candidateName?.split(' ')[0] || 'Test',
        lastName: testData?.candidateName?.split(' ').slice(1).join(' ') || 'User',
      };

      const mockJobPosting = {
        jobPostingId: 99999,
        title: testData?.jobTitle || 'Test Position - Software Engineer',
      };

      const mockApplication = {
        applicationId: testData?.applicationId || 99999,
        appliedDate: new Date(),
      };

      // Send the test email
      await this.emailService.sendApplicationThankYouEmail(
        mockCandidate as any,
        mockJobPosting as any,
        mockApplication as any
      );

      console.log('✅ Test email sent successfully');

      return {
        success: true,
        message: `Test ${emailType} email sent successfully to ${testEmail}`,
        emailSent: true,
        testData: {
          recipient: testEmail,
          candidate: mockCandidate,
          jobPosting: mockJobPosting,
          application: mockApplication,
        }
      };

    } catch (error) {
      console.error('❌ Test email failed:', error);
      
      throw new Error(`Failed to send test email: ${error.message}`);
    }
  }
}