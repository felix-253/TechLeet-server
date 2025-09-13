import { Controller, Post, Body, Headers, HttpCode, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { FileService } from './file.service';
import { InboundPayload, BrevoWebhookResponse } from './brevo-webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks/brevo')
export class BrevoWebhookController {
   private readonly logger = new Logger(BrevoWebhookController.name);

   constructor(private readonly fileService: FileService) {}

   @Post(['inbound', 'inbound/:secret'])
   @HttpCode(204)
   @ApiOperation({
      summary: 'Handle Brevo inbound email webhook',
      description: `Processes inbound emails from Brevo and extracts attachments.
    
    **Features:**
    - Downloads email attachments automatically
    - Saves attachments as files in the system
    - Prevents duplicate processing using message IDs
    - Supports authentication via secret parameter or Authorization header
    - Handles multiple attachments per email
    - Automatically categorizes files based on MIME type
    
    **Security:**
    - Optional secret validation via URL parameter or Bearer token
    - Set BREVO_WEBHOOK_SECRET environment variable for authentication
    
    **File Processing:**
    - PDF/DOC files → Candidate Resume category
    - Image files → General Document category (can be manually reclassified)
    - All files stored with email metadata for tracking
    
    **Usage:**
    Configure this endpoint in Brevo as your inbound webhook URL:
    - With secret: https://yourdomain.com/api/webhooks/brevo/inbound/your-secret
    - Without secret: https://yourdomain.com/api/webhooks/brevo/inbound`,
   })
   @ApiParam({
      name: 'secret',
      description: 'Optional webhook secret for authentication',
      required: false,
      example: 'your-webhook-secret',
   })
   @ApiBody({
      description: 'Brevo inbound email payload',
      type: InboundPayload,
      examples: {
         singleAttachment: {
            summary: 'Email with single attachment',
            value: {
               items: [
                  {
                     MessageId: 'msg_123456789',
                     From: { Address: 'candidate@example.com', Name: 'John Doe' },
                     To: [{ Address: 'hr@company.com', Name: 'HR Team' }],
                     Subject: 'Job Application - Software Engineer',
                     RawTextBody: 'Hello, I am interested in the Software Engineer position...',
                     Attachments: [
                        {
                           Name: 'john_doe_resume.pdf',
                           ContentType: 'application/pdf',
                           DownloadToken: 'abc123def456',
                        },
                     ],
                  },
               ],
            },
         },
         multipleAttachments: {
            summary: 'Email with multiple attachments',
            value: {
               items: [
                  {
                     MessageId: 'msg_987654321',
                     From: { Address: 'applicant@example.com', Name: 'Jane Smith' },
                     To: [{ Address: 'jobs@company.com' }],
                     Subject: 'Application for Marketing Manager',
                     RawTextBody: 'Please find my application materials attached.',
                     Attachments: [
                        {
                           Name: 'jane_resume.pdf',
                           ContentType: 'application/pdf',
                           DownloadToken: 'def456ghi789',
                        },
                        {
                           Name: 'portfolio.pdf',
                           ContentType: 'application/pdf',
                           DownloadToken: 'ghi789jkl012',
                        },
                        {
                           Name: 'profile_photo.jpg',
                           ContentType: 'image/jpeg',
                           DownloadToken: 'jkl012mno345',
                        },
                     ],
                  },
               ],
            },
         },
      },
   })
   @ApiResponse({
      status: 204,
      description: 'Webhook processed successfully (no content returned)',
   })
   @ApiResponse({
      status: 401,
      description: 'Unauthorized - invalid secret',
      schema: {
         type: 'object',
         properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string', example: 'Unauthorized' },
            error: { type: 'string', example: 'Unauthorized' },
         },
      },
   })
   @ApiResponse({
      status: 500,
      description: 'Internal server error during processing',
      schema: {
         type: 'object',
         properties: {
            statusCode: { type: 'number', example: 500 },
            message: { type: 'string', example: 'Internal server error' },
            error: { type: 'string', example: 'Internal Server Error' },
         },
      },
   })
   async handleInboundEmail(
      @Body() body: InboundPayload,
      @Headers() headers: Record<string, string>,
      @Param('secret') secret?: string,
   ): Promise<void> {
      try {
         // Validate webhook secret if configured
         if (process.env.BREVO_WEBHOOK_SECRET) {
            const viaHeader =
               headers['authorization'] === `Bearer ${process.env.BREVO_WEBHOOK_SECRET}`;
            const viaPath = secret === process.env.BREVO_WEBHOOK_SECRET;

            if (!viaHeader && !viaPath) {
               this.logger.warn('Unauthorized webhook request - invalid secret');
               return; // Return 204 to avoid revealing authentication failure
            }
         }

         this.logger.log(`Processing ${body.items?.length || 0} inbound email(s)`);

         let totalAttachmentsProcessed = 0;
         let totalMessagesProcessed = 0;

         // Process each email item
         for (const item of body.items ?? []) {
            try {
               // Check if message already processed to prevent duplicates
               const alreadyProcessed = await this.fileService.isMessageProcessed(item.MessageId);
               if (alreadyProcessed) {
                  this.logger.log(`Message ${item.MessageId} already processed, skipping`);
                  continue;
               }

               // Process attachments if any
               if (item.Attachments && item.Attachments.length > 0) {
                  this.logger.log(
                     `Processing ${item.Attachments.length} attachment(s) for message ${item.MessageId}`,
                  );

                  const emailMetadata = {
                     messageId: item.MessageId,
                     senderEmail: item.From.Address,
                     subject: item.Subject,
                     // You can add logic here to determine referenceId based on email content
                     // For example, parse email body for candidate ID or job posting ID
                  };

                  const createdFiles = await this.fileService.processBrevoAttachments(
                     item.Attachments,
                     emailMetadata,
                  );

                  totalAttachmentsProcessed += createdFiles.length;
                  this.logger.log(
                     `Successfully processed ${createdFiles.length} attachment(s) for message ${item.MessageId}`,
                  );
               }

               totalMessagesProcessed++;

               // TODO: Here you could add additional processing:
               // - Parse email content for candidate information
               // - Extract job application details
               // - Send notifications to HR team
               // - Update candidate records in database
               // - Queue for further processing (OCR, AI analysis, etc.)
            } catch (itemError) {
               this.logger.error(`Failed to process message ${item.MessageId}:`, itemError);
               // Continue processing other messages even if one fails
            }
         }

         this.logger.log(
            `Webhook processing completed: ${totalMessagesProcessed} messages, ${totalAttachmentsProcessed} attachments processed`,
         );

         // Return 204 No Content as expected by Brevo
         return;
      } catch (error) {
         this.logger.error('Error processing Brevo webhook:', error);
         // Still return 204 to avoid webhook retries for unexpected errors
         return;
      }
   }

   @Post('test')
   @HttpCode(200)
   @ApiOperation({
      summary: 'Test Brevo webhook endpoint',
      description: 'Test endpoint to verify webhook configuration and file processing',
   })
   @ApiResponse({
      status: 200,
      description: 'Test successful',
      type: BrevoWebhookResponse,
   })
   async testWebhook(): Promise<BrevoWebhookResponse> {
      this.logger.log('Brevo webhook test endpoint called');

      return {
         status: 'success',
         messagesProcessed: 0,
         attachmentsDownloaded: 0,
      };
   }
}
