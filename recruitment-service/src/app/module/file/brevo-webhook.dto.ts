import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InboundAttachment {
   @ApiProperty({
      description: 'Attachment filename',
      example: 'resume.pdf',
   })
   Name: string;

   @ApiProperty({
      description: 'Attachment MIME type',
      example: 'application/pdf',
   })
   ContentType: string;

   @ApiProperty({
      description: 'Token to download the attachment from Brevo API',
      example: 'abc123def456',
   })
   DownloadToken: string;
}

export class InboundRecipient {
   @ApiProperty({
      description: 'Recipient email address',
      example: 'john.doe@example.com',
   })
   Address: string;

   @ApiPropertyOptional({
      description: 'Recipient name',
      example: 'John Doe',
   })
   Name?: string;
}

export class InboundSender {
   @ApiProperty({
      description: 'Sender email address',
      example: 'candidate@example.com',
   })
   Address: string;

   @ApiPropertyOptional({
      description: 'Sender name',
      example: 'Jane Smith',
   })
   Name?: string;
}

export class InboundItem {
   @ApiProperty({
      description: 'Unique message ID from Brevo',
      example: 'msg_123456789',
   })
   MessageId: string;

   @ApiProperty({
      description: 'Message sender information',
      type: InboundSender,
   })
   From: InboundSender;

   @ApiProperty({
      description: 'Message recipients',
      type: [InboundRecipient],
   })
   To: InboundRecipient[];

   @ApiProperty({
      description: 'Email subject',
      example: 'Job Application - Software Engineer Position',
   })
   Subject: string;

   @ApiPropertyOptional({
      description: 'Raw HTML body of the email',
      example: '<html><body>Hello, I am interested in the position...</body></html>',
   })
   RawHtmlBody?: string;

   @ApiPropertyOptional({
      description: 'Raw text body of the email',
      example: 'Hello, I am interested in the position...',
   })
   RawTextBody?: string;

   @ApiPropertyOptional({
      description: 'Extracted markdown message',
      example: 'Hello, I am interested in the **Software Engineer** position...',
   })
   ExtractedMarkdownMessage?: string;

   @ApiPropertyOptional({
      description: 'Email attachments',
      type: [InboundAttachment],
   })
   Attachments?: InboundAttachment[];

   @ApiPropertyOptional({
      description: 'Email headers',
      example: { 'X-Custom-Header': 'value' },
   })
   Headers?: Record<string, any>;
}

export class InboundPayload {
   @ApiProperty({
      description: 'Array of inbound email items',
      type: [InboundItem],
   })
   items: InboundItem[];
}

export class BrevoWebhookResponse {
   @ApiProperty({
      description: 'Processing status',
      example: 'success',
   })
   status: string;

   @ApiProperty({
      description: 'Number of messages processed',
      example: 2,
   })
   messagesProcessed: number;

   @ApiProperty({
      description: 'Number of attachments downloaded',
      example: 3,
   })
   attachmentsDownloaded: number;

   @ApiPropertyOptional({
      description: 'Error message if any',
      example: 'Failed to process attachment: resume.pdf',
   })
   error?: string;
}
