import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RagDocumentEntity, DocumentEntityType } from '../../../../entities/recruitment/rag-document.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';
import { CvEmbeddingService } from '../../cv-screening/cv-embedding.service';

@Injectable()
export class EmbeddingIndexerService {
  private readonly logger = new Logger(EmbeddingIndexerService.name);

  constructor(
    @InjectRepository(RagDocumentEntity)
    private readonly ragDocumentRepository: Repository<RagDocumentEntity>,
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(InterviewEntity)
    private readonly interviewRepository: Repository<InterviewEntity>,
    private readonly cvEmbeddingService: CvEmbeddingService
  ) {}

  /**
   * Scheduled cron job to index new documents every 4 hours
   */
  @Cron(CronExpression.EVERY_4_HOURS)
  async indexNewDocuments(): Promise<void> {
    this.logger.log('Starting scheduled document indexing...');
    
    try {
      const results = await Promise.allSettled([
        this.indexJobPostings(),
        this.indexApplications(),
        this.indexCandidates(),
        this.indexInterviews()
      ]);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      this.logger.log(`Scheduled indexing completed: ${successCount} successful, ${failureCount} failed`);
    } catch (error) {
      this.logger.error('Scheduled indexing failed:', error);
    }
  }

  /**
   * Manual trigger for indexing specific entity types
   */
  async triggerIndexing(entityTypes?: DocumentEntityType[], forceReindex = false): Promise<{
    jobId: string;
    documentsQueued: number;
    entityTypes: DocumentEntityType[];
  }> {
    const jobId = `index-${Date.now()}`;
    const typesToIndex = entityTypes || Object.values(DocumentEntityType);
    
    this.logger.log(`Manual indexing triggered: ${typesToIndex.join(', ')} (force: ${forceReindex})`);

    try {
      let totalQueued = 0;

      for (const entityType of typesToIndex) {
        const count = await this.indexEntityType(entityType, forceReindex);
        totalQueued += count;
      }

      return {
        jobId,
        documentsQueued: totalQueued,
        entityTypes: typesToIndex
      };
    } catch (error) {
      this.logger.error('Manual indexing failed:', error);
      throw error;
    }
  }

  /**
   * Index job postings
   */
  async indexJobPostings(): Promise<number> {
    this.logger.log('Indexing job postings...');
    
    const jobPostings = await this.jobPostingRepository.find({
      where: { status: 'published' }
    });

    let indexedCount = 0;

    for (const job of jobPostings) {
      try {
        const content = this.buildJobPostingContent(job);
        const existingDoc = await this.ragDocumentRepository.findOne({
          where: {
            entityType: DocumentEntityType.JOB_POSTING,
            entityId: job.jobPostingId
          }
        });

        if (existingDoc && !this.shouldReindex(existingDoc, job.updatedAt)) {
          continue;
        }

        const embedding = await this.cvEmbeddingService.generateEmbedding(content);
        
        const documentData = {
          entityType: DocumentEntityType.JOB_POSTING,
          entityId: job.jobPostingId,
          content,
          embedding: JSON.stringify(embedding.embedding),
          metadata: {
            title: job.title,
            departmentId: job.departmentId,
            location: job.location,
            status: job.status,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
          },
          model: embedding.model,
          dimensions: embedding.dimensions
        };

        if (existingDoc) {
          await this.ragDocumentRepository.update(existingDoc.documentId, {
            content: documentData.content,
            embedding: documentData.embedding,
            metadata: documentData.metadata as any,
            model: documentData.model,
            dimensions: documentData.dimensions
          });
        } else {
          await this.ragDocumentRepository.save(documentData);
        }

        indexedCount++;
      } catch (error) {
        this.logger.error(`Failed to index job posting ${job.jobPostingId}:`, error);
      }
    }

    this.logger.log(`Indexed ${indexedCount} job postings`);
    return indexedCount;
  }

  /**
   * Index applications
   */
  async indexApplications(): Promise<number> {
    this.logger.log('Indexing applications...');
    
    const applications = await this.applicationRepository.find({
      relations: ['jobPosting', 'candidate']
    });

    let indexedCount = 0;

    for (const app of applications) {
      try {
        const content = this.buildApplicationContent(app);
        const existingDoc = await this.ragDocumentRepository.findOne({
          where: {
            entityType: DocumentEntityType.APPLICATION,
            entityId: app.applicationId
          }
        });

        if (existingDoc && !this.shouldReindex(existingDoc, app.updatedAt)) {
          continue;
        }

        const embedding = await this.cvEmbeddingService.generateEmbedding(content);
        
        const documentData = {
          entityType: DocumentEntityType.APPLICATION,
          entityId: app.applicationId,
          content,
          embedding: JSON.stringify(embedding.embedding),
          metadata: {
            status: app.status,
            appliedDate: app.appliedDate,
            score: app.score,
            jobPostingId: app.jobPostingId,
            candidateId: app.candidateId,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt
          },
          model: embedding.model,
          dimensions: embedding.dimensions
        };

        if (existingDoc) {
          await this.ragDocumentRepository.update(existingDoc.documentId, {
            content: documentData.content,
            embedding: documentData.embedding,
            metadata: documentData.metadata as any,
            model: documentData.model,
            dimensions: documentData.dimensions
          });
        } else {
          await this.ragDocumentRepository.save(documentData);
        }

        indexedCount++;
      } catch (error) {
        this.logger.error(`Failed to index application ${app.applicationId}:`, error);
      }
    }

    this.logger.log(`Indexed ${indexedCount} applications`);
    return indexedCount;
  }

  /**
   * Index candidates
   */
  async indexCandidates(): Promise<number> {
    this.logger.log('Indexing candidates...');
    
    const candidates = await this.candidateRepository.find();

    let indexedCount = 0;

    for (const candidate of candidates) {
      try {
        const content = this.buildCandidateContent(candidate);
        const existingDoc = await this.ragDocumentRepository.findOne({
          where: {
            entityType: DocumentEntityType.CANDIDATE,
            entityId: candidate.candidateId
          }
        });

        if (existingDoc && !this.shouldReindex(existingDoc, candidate.updatedAt)) {
          continue;
        }

        const embedding = await this.cvEmbeddingService.generateEmbedding(content);
        
        const documentData = {
          entityType: DocumentEntityType.CANDIDATE,
          entityId: candidate.candidateId,
          content,
          embedding: JSON.stringify(embedding.embedding),
          metadata: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            phoneNumber: candidate.phoneNumber,
            skills: candidate.skills,
            yearsOfExperience: candidate.yearsOfExperience,
            address: candidate.address,
            status: candidate.status,
            createdAt: candidate.createdAt,
            updatedAt: candidate.updatedAt
          },
          model: embedding.model,
          dimensions: embedding.dimensions
        };

        if (existingDoc) {
          await this.ragDocumentRepository.update(existingDoc.documentId, {
            content: documentData.content,
            embedding: documentData.embedding,
            metadata: documentData.metadata as any,
            model: documentData.model,
            dimensions: documentData.dimensions
          });
        } else {
          await this.ragDocumentRepository.save(documentData);
        }

        indexedCount++;
      } catch (error) {
        this.logger.error(`Failed to index candidate ${candidate.candidateId}:`, error);
      }
    }

    this.logger.log(`Indexed ${indexedCount} candidates`);
    return indexedCount;
  }

  /**
   * Index interviews
   */
  async indexInterviews(): Promise<number> {
    this.logger.log('Indexing interviews...');
    
    const interviews = await this.interviewRepository.find({
      relations: ['candidate']
    });

    let indexedCount = 0;

    for (const interview of interviews) {
      try {
        const content = this.buildInterviewContent(interview);
        const existingDoc = await this.ragDocumentRepository.findOne({
          where: {
            entityType: DocumentEntityType.INTERVIEW,
            entityId: interview.interview_id
          }
        });

        if (existingDoc && !this.shouldReindex(existingDoc, interview.updatedAt)) {
          continue;
        }

        const embedding = await this.cvEmbeddingService.generateEmbedding(content);
        
        const documentData = {
          entityType: DocumentEntityType.INTERVIEW,
          entityId: interview.interview_id,
          content,
          embedding: JSON.stringify(embedding.embedding),
          metadata: {
            candidateId: interview.candidate_id,
            jobId: interview.job_id,
            scheduledAt: interview.scheduled_at,
            status: interview.status,
            meetingLink: interview.meeting_link,
            location: interview.location,
            interviewerIds: interview.interviewer_ids,
            createdAt: interview.createdAt,
            updatedAt: interview.updatedAt
          },
          model: embedding.model,
          dimensions: embedding.dimensions
        };

        if (existingDoc) {
          await this.ragDocumentRepository.update(existingDoc.documentId, {
            content: documentData.content,
            embedding: documentData.embedding,
            metadata: documentData.metadata as any,
            model: documentData.model,
            dimensions: documentData.dimensions
          });
        } else {
          await this.ragDocumentRepository.save(documentData);
        }

        indexedCount++;
      } catch (error) {
        this.logger.error(`Failed to index interview ${interview.interview_id}:`, error);
      }
    }

    this.logger.log(`Indexed ${indexedCount} interviews`);
    return indexedCount;
  }

  /**
   * Index specific entity type
   */
  private async indexEntityType(entityType: DocumentEntityType, forceReindex: boolean): Promise<number> {
    switch (entityType) {
      case DocumentEntityType.JOB_POSTING:
        return await this.indexJobPostings();
      case DocumentEntityType.APPLICATION:
        return await this.indexApplications();
      case DocumentEntityType.CANDIDATE:
        return await this.indexCandidates();
      case DocumentEntityType.INTERVIEW:
        return await this.indexInterviews();
      default:
        this.logger.warn(`Unknown entity type: ${entityType}`);
        return 0;
    }
  }

  /**
   * Build content for job posting
   */
  private buildJobPostingContent(job: JobPostingEntity): string {
    return `
Job Title: ${job.title}
Department ID: ${job.departmentId}
Location: ${job.location}
Description: ${job.description}
Requirements: ${job.requirements}
Salary Range: ${job.salaryMin ? job.salaryMin : 'Not specified'} - ${job.salaryMax ? job.salaryMax : 'Not specified'}
Status: ${job.status}
    `.trim();
  }

  /**
   * Build content for application
   */
  private buildApplicationContent(app: ApplicationEntity): string {
    return `
Application ID: ${app.applicationId}
Status: ${app.status}
Applied Date: ${app.appliedDate}
Job Posting ID: ${app.jobPostingId}
Candidate ID: ${app.candidateId}
Cover Letter: ${app.coverLetter || 'None'}
Score: ${app.score || 'Not scored'}
Review Notes: ${app.reviewNotes || 'None'}
    `.trim();
  }

  /**
   * Build content for candidate
   */
  private buildCandidateContent(candidate: CandidateEntity): string {
    return `
Candidate: ${candidate.firstName} ${candidate.lastName}
Email: ${candidate.email}
Phone: ${candidate.phoneNumber || 'Not provided'}
Location: ${candidate.address || 'Not provided'}
Skills: ${candidate.skills || 'Not specified'}
Experience: ${candidate.yearsOfExperience || 0} years
Status: ${candidate.status}
    `.trim();
  }

  /**
   * Build content for interview
   */
  private buildInterviewContent(interview: InterviewEntity): string {
    return `
Interview ID: ${interview.interview_id}
Candidate: ${interview.candidate_id}
Job ID: ${interview.job_id}
Scheduled At: ${interview.scheduled_at}
Status: ${interview.status}
Location: ${interview.location || 'Not specified'}
Meeting Link: ${interview.meeting_link || 'Not provided'}
Interviewers: ${interview.interviewer_ids ? interview.interviewer_ids.join(', ') : 'Not assigned'}
    `.trim();
  }

  /**
   * Check if document should be reindexed
   */
  private shouldReindex(existingDoc: RagDocumentEntity, entityUpdatedAt: Date): boolean {
    return existingDoc.updatedAt < entityUpdatedAt;
  }

  /**
   * Get indexing statistics
   */
  async getIndexingStats(): Promise<any> {
    const stats = await this.ragDocumentRepository
      .createQueryBuilder('doc')
      .select('doc.entityType, COUNT(*) as count')
      .groupBy('doc.entityType')
      .getRawMany();

    const totalDocuments = await this.ragDocumentRepository.count();

    return {
      totalDocuments,
      byEntityType: stats.reduce((acc, stat) => {
        acc[stat.entityType] = parseInt(stat.count);
        return acc;
      }, {}),
      lastUpdated: new Date()
    };
  }
}
