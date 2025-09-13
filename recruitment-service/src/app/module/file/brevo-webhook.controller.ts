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
   async handleInboundEmail(
      @Body() body: InboundPayload,
      @Headers() headers: Record<string, string>,
      @Param('secret') secret?: string,
   ): Promise<void> {
      try {
         this.logger.log(`Processing ${body.items?.length || 0} inbound email(s)`);

         let totalAttachmentsProcessed = 0;
         let totalMessagesProcessed = 0;
         for (const item of body.items ?? []) {
            try {
               // Check if message already processed to prevent duplicates
               // const alreadyProcessed = await this.fileService.isMessageProcessed(item.MessageId);
               // if (alreadyProcessed) {
               //    this.logger.log(`Message ${item.MessageId} already processed, skipping`);
               //    continue;
               // }

               if (item.Attachments && item.Attachments.length > 0) {
                  this.logger.log(
                     `Processing ${item.Attachments.length} attachment(s) for message ${item.MessageId}`,
                  );

                  const emailMetadata = {
                     messageId: item.MessageId,
                     senderEmail: item.From.Address,
                     subject: item.Subject,
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
            } catch (itemError) {
               this.logger.error(`Failed to process message ${item.MessageId}:`, itemError);
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
