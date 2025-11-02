# Brevo Email Flow - Complete Documentation

## Overview
This document explains the complete flow of how emails are processed when candidates send their CV via email to job-specific addresses (e.g., `job55@reply.techleet.me`).

## Email Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Candidate sends email with CV attachment                    │
│    To: job55@reply.techleet.me                                 │
│    From: candidate@gmail.com                                   │
│    Attachment: cv.pdf                                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Brevo Inbound Email Service                                 │
│    - Receives email                                            │
│    - Processes attachments                                     │
│    - Sends webhook to our server                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Our Webhook Endpoint                                        │
│    POST /api/webhooks/brevo/inbound                            │
│    - brevo-webhook.controller.ts                               │
│    - Receives webhook payload with attachments                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. File Service - processBrevoAttachments()                    │
│    - file.service.ts                                           │
│    - Extracts job ID from email (job55@reply.techleet.me)     │
│    - Extracts candidate email from sender                      │
│    - Delegates to BrevoHandler                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Brevo Handler - processBrevoAttachments()                  │
│    - brevo-handler.service.ts                                  │
│    - Saves file entities to database                           │
│    - Logs processing results                                   │
│    - Returns processed file list                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. File Service - processResumeFilesAsync() ⚡ ASYNC          │
│    - Triggered automatically after files are saved             │
│    - Filters for PDF resume files                              │
│    - Calls extractApplicationFromPdfs() for each CV            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Application Service - extractApplicationFromPdfs()         │
│    - application.service.ts                                    │
│    - Extracts candidate info from PDF                          │
│    - Creates or finds candidate in database                    │
│    - Creates application record                                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Information Service - extractCandidateInformationFromPdf() │
│    - information.service.ts                                    │
│    - Extracts text from PDF using OCR                          │
│    - Parses candidate information (name, email, skills, etc.)  │
│    - Creates candidate entity                                  │
│    - Creates application entity                                │
│    - 📧 SENDS THANK YOU EMAIL                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Email Service - sendApplicationThankYouEmail()             │
│    - email.service.ts                                          │
│    - Fetches candidate details                                 │
│    - Fetches job posting details                               │
│    - Sends email via Brevo API                                 │
│    - Uses Template #7                                          │
│    - ✅ Email sent to candidate                                │
└─────────────────────────────────────────────────────────────────┘
```

## Code Flow Breakdown

### Step 1-3: Webhook Reception
**File:** `brevo-webhook.controller.ts`

```typescript
@Post(['inbound', 'inbound/:secret'])
async handleInboundEmail(@Body() body: InboundPayload) {
  for (const item of body.items) {
    if (item.Attachments && item.Attachments.length > 0) {
      const createdFiles = await this.fileService.processBrevoAttachments(
        item.Attachments,
        emailMetadata
      );
    }
  }
}
```

**Logs:**
```
[BrevoWebhookController] Processing 1 inbound email(s)
[BrevoWebhookController] Processing 1 attachment(s) for message <ABC123>
```

### Step 4: File Service Processing
**File:** `file.service.ts`

```typescript
async processBrevoAttachments(attachments, emailMetadata) {
  // Extract job ID from email
  const jobInfo = this.brevoHandler.extractJobInfoFromBrevoEmail({
    Recipient: [emailMetadata?.recipientEmail],  // job55@reply.techleet.me
    From: { Email: emailMetadata?.senderEmail }  // candidate@gmail.com
  });

  // Process and save files
  const processedFiles = await this.brevoHandler.processBrevoAttachments(
    attachments,
    jobInfo.candidateEmail,
    jobInfo.jobId,
    jobInfo.candidateName
  );

  // ⚡ Trigger CV extraction asynchronously
  this.processResumeFilesAsync(fileEntities, jobInfo.jobId).catch(error => {
    console.error('❌ Failed to process resume files:', error);
  });

  return fileEntities;
}
```

**Logs:**
```
📧 Processing Brevo attachments for candidate candidate@gmail.com, job 55
```

### Step 5: Brevo Handler
**File:** `brevo-handler.service.ts`

```typescript
async processBrevoAttachments(brevoAttachments, candidateEmail, jobId) {
  for (const attachment of brevoAttachments) {
    // Save file entity to database
    const fileEntity = new FileEntity();
    fileEntity.originalName = attachment.Name;
    fileEntity.fileUrl = attachment.DownloadToken || attachment.Url;
    // ... save file
  }

  return processedFiles;
}
```

**Logs:**
```
📧 Processing 1 attachments from Brevo for job 55
📎 Processing attachment: cv1.pdf (12345 bytes)
💾 Saved file entity: 37 - cv1.pdf
✅ Brevo attachment processing complete: 1 files processed
📧 CV extraction and thank you email will be triggered automatically
```

### Step 6: Async Resume Processing
**File:** `file.service.ts`

```typescript
private async processResumeFilesAsync(files, jobId) {
  // Filter for resume/CV files (PDFs)
  const resumeFiles = files.filter(file => 
    file.fileType === FileType.CANDIDATE_RESUME &&
    file.mimeType === 'application/pdf'
  );

  for (const resumeFile of resumeFiles) {
    // Trigger CV extraction and application creation
    const application = await this.applicationService.extractApplicationFromPdfs(
      resumeFile.fileUrl,
      jobId
    );
  }
}
```

**Logs:**
```
📄 Processing 1 resume file(s) from Brevo
🔍 Extracting CV information from: cv1.pdf
```

### Step 7-8: Application Creation
**File:** `application.service.ts` → `information.service.ts`

```typescript
// application.service.ts
async extractApplicationFromPdfs(pdfFilePath, jobPostingId) {
  // Extract candidate info from PDF
  const candidateInfo = await this.informationService
    .extractCandidateInformationFromPdf(pdfFilePath, jobPostingId);

  // Create application
  const application = await this.create(createApplicationDto);
  
  return application;
}

// information.service.ts
async extractCandidateInformationFromPdf(pdfFilePath, jobPostingId) {
  // Extract text and parse CV
  const processedData = await this.nlpProcessingService.processCvText(text);
  
  // Create candidate
  const candidate = await this.createOrUpdateCandidate(processedData);
  
  // Create application (THIS SENDS EMAIL)
  const application = await this.createApplication(
    candidate.candidateId,
    jobPostingId,
    processedData,
    aiAnalysis
  );
  
  return { success: true, candidateId: candidate.candidateId, ... };
}

private async createApplication(candidateId, jobPostingId, processedData) {
  // Create application
  const application = this.applicationRepository.create({...});
  const savedApplication = await this.applicationRepository.save(application);

  // 📧 SEND THANK YOU EMAIL
  try {
    const candidate = await this.candidateRepository.findOne({ candidateId });
    const jobPosting = await this.jobPostingRepository.findOne({ jobPostingId });

    await this.recruitmentEmailService.sendApplicationThankYouEmail(
      candidate,
      jobPosting,
      savedApplication
    );
  } catch (emailError) {
    console.error('❌ Failed to send thank you email:', emailError);
  }

  return savedApplication;
}
```

**Logs:**
```
Bắt đầu trích xuất application từ PDF: ./uploads/cv1.pdf
Đã tạo/cập nhật candidate với ID: 123
Đã tạo application với ID: 456
Sending thank you email for application 456
✅ Thank you email sent successfully for application 456 (PDF flow)
✅ Successfully created application 456 from Brevo CV
📧 Thank you email should have been sent automatically
```

### Step 9: Email Sending
**File:** `email.service.ts`

```typescript
async sendApplicationThankYouEmail(candidate, jobPosting, application) {
  const sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.subject = `Cảm ơn bạn đã ứng tuyển vị trí ${jobPosting.title} - TechLeet`;
  sendSmtpEmail.templateId = 7;
  sendSmtpEmail.to = [{ 
    email: candidate.email, 
    name: `${candidate.firstName} ${candidate.lastName}` 
  }];

  sendSmtpEmail.params = {
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    jobTitle: jobPosting.title,
    applicationId: application.applicationId,
    // ... more params
  };

  await this.apiInstance.sendTransacEmail(sendSmtpEmail);
}
```

**Logs:**
```
✅ Thank you email sent to candidate@gmail.com for application 456
```

## Complete Log Sequence

When everything works correctly, you should see:

```
[BrevoWebhookController] Processing 1 inbound email(s)
[BrevoWebhookController] Processing 1 attachment(s) for message <ABC123>
📧 Processing Brevo attachments for candidate candidate@gmail.com, job 55
📧 Processing 1 attachments from Brevo for job 55
📎 Processing attachment: cv1.pdf (12345 bytes)
💾 Saved file entity: 37 - cv1.pdf
✅ Brevo attachment processing complete: 1 files processed
📧 CV extraction and thank you email will be triggered automatically
[BrevoWebhookController] Successfully processed 1 attachment(s) for message <ABC123>
[BrevoWebhookController] Webhook processing completed: 1 messages, 1 attachments processed

📄 Processing 1 resume file(s) from Brevo
🔍 Extracting CV information from: cv1.pdf
Bắt đầu trích xuất application từ PDF: ./uploads/cv1.pdf
Đã tạo/cập nhật candidate với ID: 123
Đã tạo application với ID: 456
Sending thank you email for application 456
✅ Thank you email sent to candidate@gmail.com for application 456
✅ Thank you email sent successfully for application 456 (PDF flow)
✅ Successfully created application 456 from Brevo CV
📧 Thank you email should have been sent automatically
```

## Troubleshooting

### No Email Logs
If you see the Brevo processing logs but NO email logs:

1. **Check if CV extraction is triggered:**
   - Look for: `📄 Processing X resume file(s) from Brevo`
   - Look for: `🔍 Extracting CV information from: cv1.pdf`
   
2. **Check if application is created:**
   - Look for: `Đã tạo application với ID: XXX`
   
3. **Check for email sending attempt:**
   - Look for: `Sending thank you email for application XXX`
   - Look for: `✅ Thank you email sent to XXX`

### Common Issues

**Issue 1: CV extraction not triggered**
- **Symptom:** Only see file saving logs, no extraction logs
- **Cause:** `processResumeFilesAsync()` not being called or failing silently
- **Solution:** Check that files are saved with `fileType: CANDIDATE_RESUME`

**Issue 2: Application creation fails**
- **Symptom:** See extraction logs but no application creation
- **Cause:** PDF parsing error, invalid job ID, or database error
- **Solution:** Check error logs for PDF extraction failures

**Issue 3: Email sending fails**
- **Symptom:** Application created but no email sent
- **Cause:** Brevo API key missing, template not found, or network error
- **Solution:** Check `SENDINBLUE_API_KEY` environment variable

## Environment Variables Required

```bash
# Backend (.env)
SENDINBLUE_API_KEY=your_brevo_api_key_here
FRONTEND_URL=http://localhost:8080

# Brevo Webhook Configuration
BREVO_WEBHOOK_URL=https://your-domain.com/api/v1/recruitment-service/webhooks/brevo/inbound
```

## Key Files

1. **Webhook Entry:** `brevo-webhook.controller.ts`
2. **File Processing:** `file.service.ts`
3. **Attachment Handling:** `handlers/brevo-handler.service.ts`
4. **CV Extraction:** `information.service.ts`
5. **Application Creation:** `application.service.ts`
6. **Email Sending:** `email.service.ts`

## Email Templates

- **Template #7:** Thank you email (application submission)
- **Template #8:** Interview invitation (online)
- **Template #9:** Interview invitation (offline)

## Testing

To test the complete flow:

1. Send email with CV attachment to `job55@reply.techleet.me`
2. Monitor backend logs for all steps
3. Check database for:
   - File entity created
   - Candidate created
   - Application created
4. Verify email received in candidate's inbox
5. Check Brevo dashboard for email sent status

## Summary

The complete flow is:
1. ✅ Brevo receives email
2. ✅ Webhook saves attachments
3. ✅ **NEW:** Automatic CV extraction triggered
4. ✅ Candidate and application created
5. ✅ Thank you email sent automatically

The key improvement is Step 3 - we now automatically trigger CV extraction and application creation, which was missing before!
