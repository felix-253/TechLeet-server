import { Entity, Column, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileEntity, FileType } from './file.entity';

/**
 * This file shows examples of how to add file relationships to existing entities.
 * You can add these relationships to your existing Employee, Candidate, and Company entities.
 */

// Example: How to add avatar relationship to Employee entity
export class EmployeeWithAvatar {
   // ... existing employee fields ...

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   @JoinColumn()
   @ApiPropertyOptional({
      description: 'Employee avatar files',
      type: [FileEntity],
   })
   avatars?: FileEntity[];

   // Virtual property to get current avatar
   get currentAvatar(): FileEntity | null {
      return this.avatars && this.avatars.length > 0 ? this.avatars[0] : null;
   }

   @ApiPropertyOptional({
      description: 'Current avatar URL',
      example: 'https://storage.example.com/avatars/employee_123.jpg',
   })
   get avatarUrl(): string | null {
      return this.currentAvatar?.fileUrl || null;
   }
}

// Example: How to add resume relationship to Candidate entity
export class CandidateWithResumes {
   // ... existing candidate fields ...

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   @JoinColumn()
   @ApiPropertyOptional({
      description: 'Candidate resume files',
      type: [FileEntity],
   })
   resumes?: FileEntity[];

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   @JoinColumn()
   @ApiPropertyOptional({
      description: 'All candidate files',
      type: [FileEntity],
   })
   allFiles?: FileEntity[];

   // Virtual property to get latest resume
   get latestResume(): FileEntity | null {
      return this.resumes && this.resumes.length > 0 ? this.resumes[0] : null;
   }

   @ApiPropertyOptional({
      description: 'Latest resume URL',
      example: 'https://storage.example.com/resumes/candidate_456_resume.pdf',
   })
   get latestResumeUrl(): string | null {
      return this.latestResume?.fileUrl || null;
   }
}

// Example: How to add logo relationship to Company entity
export class CompanyWithLogo {
   // ... existing company fields ...

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   @JoinColumn()
   @ApiPropertyOptional({
      description: 'Company logo files',
      type: [FileEntity],
   })
   logos?: FileEntity[];

   // Virtual property to get current logo
   get currentLogo(): FileEntity | null {
      return this.logos && this.logos.length > 0 ? this.logos[0] : null;
   }

   @ApiPropertyOptional({
      description: 'Current logo URL',
      example: 'https://storage.example.com/logos/company_789_logo.png',
   })
   get logoUrl(): string | null {
      return this.currentLogo?.fileUrl || null;
   }
}

// Example: How to add file attachments to Job Posting entity
export class JobPostingWithAttachments {
   // ... existing job posting fields ...

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   @JoinColumn()
   @ApiPropertyOptional({
      description: 'Job posting attachment files',
      type: [FileEntity],
   })
   attachments?: FileEntity[];

   @ApiPropertyOptional({
      description: 'Number of attachments',
      example: 3,
   })
   get attachmentCount(): number {
      return this.attachments?.length || 0;
   }
}

// Example: How to add document relationship to Application entity
export class ApplicationWithDocuments {
   // ... existing application fields ...

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   @JoinColumn()
   @ApiPropertyOptional({
      description: 'Application document files',
      type: [FileEntity],
   })
   documents?: FileEntity[];

   @ApiPropertyOptional({
      description: 'Number of documents',
      example: 2,
   })
   get documentCount(): number {
      return this.documents?.length || 0;
   }
}

/**
 * Service helper methods to include files in entity queries
 */
export class EntityFileHelpers {
   /**
    * Get find options to include employee avatar
    */
   static getEmployeeWithAvatarOptions() {
      return {
         relations: {
            avatars: true,
         },
         where: {
            avatars: {
               fileType: FileType.EMPLOYEE_AVATAR,
            },
         },
      };
   }

   /**
    * Get find options to include candidate resumes
    */
   static getCandidateWithResumesOptions() {
      return {
         relations: {
            resumes: true,
            allFiles: true,
         },
         where: {
            resumes: {
               fileType: FileType.CANDIDATE_RESUME,
            },
         },
      };
   }

   /**
    * Get find options to include company logo
    */
   static getCompanyWithLogoOptions() {
      return {
         relations: {
            logos: true,
         },
         where: {
            logos: {
               fileType: FileType.COMPANY_LOGO,
            },
         },
      };
   }
}

/**
 * Response DTOs that include file information
 */
export class EmployeeWithFilesResponseDto {
   // ... existing employee response fields ...

   @ApiPropertyOptional({
      description: 'Employee avatar URL',
      example: 'https://storage.example.com/avatars/employee_123.jpg',
   })
   avatarUrl?: string;

   @ApiPropertyOptional({
      description: 'Avatar file information',
      type: FileEntity,
   })
   avatar?: FileEntity;
}

export class CandidateWithFilesResponseDto {
   // ... existing candidate response fields ...

   @ApiPropertyOptional({
      description: 'Latest resume URL',
      example: 'https://storage.example.com/resumes/candidate_456_resume.pdf',
   })
   latestResumeUrl?: string;

   @ApiPropertyOptional({
      description: 'All resume files',
      type: [FileEntity],
   })
   resumes?: FileEntity[];

   @ApiPropertyOptional({
      description: 'Number of uploaded files',
      example: 3,
   })
   fileCount?: number;
}

export class CompanyWithFilesResponseDto {
   // ... existing company response fields ...

   @ApiPropertyOptional({
      description: 'Company logo URL',
      example: 'https://storage.example.com/logos/company_789_logo.png',
   })
   logoUrl?: string;

   @ApiPropertyOptional({
      description: 'Logo file information',
      type: FileEntity,
   })
   logo?: FileEntity;
}
