import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FileEntity, FileType, FileStatus } from '../../../../entities/recruitment/file.entity';
import { RecruitmentEmailService } from '../../email/email.service';

@Injectable()
export class BrevoHandler {
   constructor(
      private readonly entityManager: EntityManager,
      private readonly recruitmentEmailService: RecruitmentEmailService
   ) {}

   /**
    * Process Brevo email attachments and send thank you email
    * This integrates with the Brevo webhook processing flow
    */
   async processBrevoAttachments(
      brevoAttachments: any[],
      candidateEmail: string,
      jobId: number,
      candidateName?: string
   ): Promise<any[]> {
      console.log(`📧 Processing ${brevoAttachments.length} attachments from Brevo for job ${jobId}`);
      
      const processedFiles: any[] = [];
      
      try {
         for (const attachment of brevoAttachments) {
            try {
               console.log(`📎 Processing attachment: ${attachment.Name} (${attachment.Size} bytes)`);
               
               // Save file entity to database
               const fileEntity = new FileEntity();
               fileEntity.originalName = attachment.Name;
               fileEntity.fileName = attachment.Name;
               fileEntity.fileUrl = attachment.DownloadToken || attachment.Url || '';
               fileEntity.fileSize = attachment.Size || 0;
               fileEntity.mimeType = attachment.ContentType || 'application/octet-stream';
               fileEntity.fileType = FileType.CANDIDATE_RESUME; // Default type for email attachments
               fileEntity.referenceId = jobId;
               fileEntity.status = FileStatus.ACTIVE;
               fileEntity.description = `Email attachment from ${candidateEmail}`;
               
               // Additional Brevo-specific metadata
               fileEntity.metadata = {
                  source: 'brevo',
                  candidateEmail,
                  jobId,
                  downloadToken: attachment.DownloadToken,
                  contentId: attachment.ContentId,
                  brevoMetadata: attachment
               };
               
               const savedFile = await this.entityManager.save(FileEntity, fileEntity);
               
               console.log(`💾 Saved file entity: ${savedFile.fileId} - ${savedFile.originalName}`);
               
               processedFiles.push({
                  id: savedFile.fileId,
                  originalName: savedFile.originalName,
                  fileSize: savedFile.fileSize,
                  mimeType: savedFile.mimeType,
                  source: 'brevo',
                  processedAt: new Date()
               });
               
            } catch (fileError) {
               console.error(`❌ Failed to process attachment ${attachment.Name}:`, fileError);
               
               // Add failed file to results for tracking
               processedFiles.push({
                  originalName: attachment.Name,
                  error: fileError.message,
                  source: 'brevo',
                  processedAt: new Date(),
                  failed: true
               });
            }
         }
         
         // NOTE: Thank you email will be sent AFTER candidate and application are created
         // This happens in the information.service.ts or application.service.ts flow
         // We don't send email here because candidate/application don't exist yet
         console.log(`✅ Brevo attachment processing complete: ${processedFiles.length} files processed`);
         
         return processedFiles;
         
      } catch (error) {
         console.error('❌ Failed to process Brevo attachments:', error);
         throw error;
      }
   }

   /**
    * ⛔ DEPRECATED - DO NOT USE
    * 
    * This method has been deprecated because it sends emails with temporary objects
    * that don't exist in the database.
    * 
    * The proper email flow is now:
    * 1. Brevo webhook receives email with CV attachments
    * 2. Files are saved to database (processBrevoAttachments)
    * 3. file.service.ts automatically triggers CV extraction (processResumeFilesAsync)
    * 4. application.service.extractApplicationFromPdfs() is called
    * 5. Candidate is created (information.service.ts)
    * 6. Application is created (application.service.create())
    * 7. ✅ Thank you email is sent automatically with real data
    * 
    * @deprecated Use the automatic flow instead - emails are sent after application creation
    */
   private async sendApplicationThankYouEmail_DEPRECATED(
      candidateEmail: string,
      jobId: number,
      candidateName?: string,
      processedFiles?: any[]
   ): Promise<void> {
      try {
         console.log(`📧 Sending thank you email to ${candidateEmail} for job ${jobId}`);
         
         // Build file summary for thank you email
         const fileSummary = processedFiles 
            ? processedFiles.map(file => `• ${file.originalName} (${(file.fileSize / 1024).toFixed(1)} KB)`).join('\n')
            : 'Các tài liệu đã được nhận';
         
         // Create temporary candidate, job posting, and application objects for email service
         const tempCandidate = {
            email: candidateEmail,
            firstName: candidateName?.split(' ')[0] || 'Ứng',
            lastName: candidateName?.split(' ').slice(1).join(' ') || 'viên',
            candidateId: 0 // Temporary ID for Brevo candidates
         };

         const tempJobPosting = {
            title: `Vị trí tuyển dụng #${jobId}`,
            jobId: jobId
         };

         const tempApplication = {
            applicationId: Date.now(), // Use timestamp as temporary ID
            submittedAt: new Date()
         };

         // Send thank you email using RecruitmentEmailService
         await this.recruitmentEmailService.sendApplicationThankYouEmail(
            tempCandidate as any,
            tempJobPosting as any, 
            tempApplication as any
         );
         
         console.log(`✅ Thank you email sent successfully to ${candidateEmail}`);
         
      } catch (emailError) {
         console.error(`❌ Failed to send thank you email to ${candidateEmail}:`, emailError);
         // Don't throw - email failure shouldn't break file processing
      }
   }

   /**
    * Extract job ID and candidate info from Brevo email
    */
   extractJobInfoFromBrevoEmail(brevoData: any): {
      jobId: number | null;
      candidateEmail: string | null;
      candidateName: string | null;
   } {
      try {
         // Extract job ID from recipient email (job55@reply.techleet.me)
         const toEmails = brevoData.Recipient || [];
         let jobId: number | null = null;
         
         for (const email of toEmails) {
            const jobMatch = email.match(/job(\d+)@/);
            if (jobMatch) {
               jobId = parseInt(jobMatch[1]);
               break;
            }
         }
         
         // Extract candidate email from sender
         const candidateEmail = brevoData.From?.Email || brevoData.From || null;
         
         // Extract candidate name from sender name or email
         let candidateName: string | null = null;
         if (brevoData.From?.Name) {
            candidateName = brevoData.From.Name;
         } else if (candidateEmail) {
            // Try to extract name from email (e.g., "john.doe@gmail.com" -> "John Doe")
            const namePart = candidateEmail.split('@')[0];
            candidateName = namePart
               .split('.')
               .map(part => part.charAt(0).toUpperCase() + part.slice(1))
               .join(' ');
         }
         
         return {
            jobId,
            candidateEmail,
            candidateName
         };
         
      } catch (error) {
         console.error('❌ Failed to extract job info from Brevo email:', error);
         return {
            jobId: null,
            candidateEmail: null,
            candidateName: null
         };
      }
   }

   /**
    * Validate Brevo attachment before processing
    */
   validateBrevoAttachment(attachment: any): {
      isValid: boolean;
      issues: string[];
   } {
      const issues: string[] = [];
      
      // Check required fields
      if (!attachment.Name) {
         issues.push('Missing attachment name');
      }
      
      if (!attachment.Size || attachment.Size <= 0) {
         issues.push('Invalid or missing file size');
      }
      
      if (!attachment.DownloadToken && !attachment.Url) {
         issues.push('Missing download token or URL');
      }
      
      // Check file size limits (10MB max)
      if (attachment.Size && attachment.Size > 10 * 1024 * 1024) {
         issues.push('File size exceeds 10MB limit');
      }
      
      // Check for suspicious file types
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
      const fileName = attachment.Name?.toLowerCase() || '';
      
      if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
         issues.push('Potentially unsafe file type');
      }
      
      return {
         isValid: issues.length === 0,
         issues
      };
   }

   /**
    * Log Brevo processing results for monitoring
    */
   logBrevoProcessingResults(
      jobId: number,
      candidateEmail: string,
      processedFiles: any[],
      processingTimeMs: number
   ): void {
      const successCount = processedFiles.filter(file => !file.failed).length;
      const failureCount = processedFiles.filter(file => file.failed).length;
      
      console.log(`📊 Brevo Processing Summary:
         • Job ID: ${jobId}
         • Candidate: ${candidateEmail}
         • Files Processed: ${successCount}/${processedFiles.length}
         • Failures: ${failureCount}
         • Processing Time: ${processingTimeMs}ms
         • Files: ${processedFiles.map(f => f.originalName).join(', ')}
      `);
      
      // Log failures separately for debugging
      if (failureCount > 0) {
         const failures = processedFiles.filter(file => file.failed);
         console.error(`❌ Brevo Processing Failures:`, failures);
      }
   }
}
