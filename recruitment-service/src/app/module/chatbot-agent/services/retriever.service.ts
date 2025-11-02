import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { RagDocumentEntity, DocumentEntityType } from '../../../../entities/recruitment/rag-document.entity';
import { CvEmbeddingService } from '../../cv-screening/processors/cv-embedding.service';
import { MetadataFiltersDto, RetrievalResultDto } from '../dto/session.dto';

export interface RetrievalOptions {
  limit?: number;
  threshold?: number;
  filters?: MetadataFiltersDto;
}

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);
  private readonly defaultLimit = 10;
  private readonly defaultThreshold = 0.7;

  constructor(
    @InjectRepository(RagDocumentEntity)
    private readonly ragDocumentRepository: Repository<RagDocumentEntity>,
    private readonly cvEmbeddingService: CvEmbeddingService
  ) {}

  /**
   * Retrieve relevant documents using hybrid search
   */
  async retrieve(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Retrieving documents for query: "${query}"`);

      // Generate query embedding
      const queryEmbedding = await this.cvEmbeddingService.generateEmbedding(query);
      
      // Build search query with filters
      const searchQuery = this.buildSearchQuery(queryEmbedding.embedding, options);
      
      // Execute hybrid search
      const results = await this.ragDocumentRepository.query(searchQuery.query, searchQuery.params);
      
      // Format results
      const formattedResults = results.map((row: any) => ({
        documentId: row.documentId,
        entityType: row.entityType,
        entityId: row.entityId,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata
      }));

      const processingTime = Date.now() - startTime;
      this.logger.log(`Retrieved ${formattedResults.length} documents in ${processingTime}ms`);

      return formattedResults;
    } catch (error) {
      this.logger.error(`Retrieval failed for query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Build search query with vector similarity and metadata filtering
   */
  private buildSearchQuery(queryEmbedding: number[], options: RetrievalOptions): {
    query: string;
    params: any[];
  } {
    const limit = options.limit || this.defaultLimit;
    const threshold = options.threshold || this.defaultThreshold;
    const filters = options.filters || {};

    let query = `
      SELECT 
        doc."documentId",
        doc.entity_type AS "entityType",
        doc.entity_id AS "entityId",
        doc.content,
        doc.metadata,
        (1 - (doc.embedding <=> $1::vector)) as similarity
      FROM rag_document doc
      WHERE doc.embedding IS NOT NULL
        AND (1 - (doc.embedding <=> $1::vector)) >= $2
    `;

    const params: any[] = [queryEmbedding, threshold];
    let paramIndex = 3;

    // Add entity type filter
    if (filters.entityTypes && filters.entityTypes.length > 0) {
      const entityTypePlaceholders = filters.entityTypes.map(() => `$${paramIndex++}`).join(',');
      query += ` AND doc.entity_type IN (${entityTypePlaceholders})`;
      params.push(...filters.entityTypes);
    }

    // Add status filter
    if (filters.status) {
      query += ` AND doc.metadata->>'status' = $${paramIndex++}`;
      params.push(filters.status);
    }

    // Add department filter
    if (filters.department) {
      query += ` AND doc.metadata->>'department' ILIKE $${paramIndex++}`;
      params.push(`%${filters.department}%`);
    }

    // Add date range filters
    if (filters.dateFrom) {
      query += ` AND (doc.metadata->>'createdAt')::timestamp >= $${paramIndex++}`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ` AND (doc.metadata->>'createdAt')::timestamp <= $${paramIndex++}`;
      params.push(filters.dateTo);
    }

    // Add skills filter
    if (filters.skills && filters.skills.length > 0) {
      const skillConditions = filters.skills.map((skill, index) => {
        const condition = `doc.metadata->>'skills' ILIKE $${paramIndex++}`;
        params.push(`%${skill}%`);
        return condition;
      });
      query += ` AND (${skillConditions.join(' OR ')})`;
    }

    // Order by similarity and limit
    query += ` ORDER BY doc.embedding <=> $1::vector LIMIT $${paramIndex++}`;
    params.push(limit);

    return { query, params };
  }

  /**
   * Retrieve documents by entity type
   */
  async retrieveByEntityType(
    entityType: DocumentEntityType,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResultDto[]> {
    const filters = { ...options.filters, entityTypes: [entityType] };
    return this.retrieve(query, { ...options, filters });
  }

  /**
   * Retrieve job postings
   */
  async retrieveJobPostings(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    return this.retrieveByEntityType(DocumentEntityType.JOB_POSTING, query, options);
  }

  /**
   * Retrieve applications
   */
  async retrieveApplications(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    return this.retrieveByEntityType(DocumentEntityType.APPLICATION, query, options);
  }

  /**
   * Retrieve candidates
   */
  async retrieveCandidates(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    return this.retrieveByEntityType(DocumentEntityType.CANDIDATE, query, options);
  }

  /**
   * Retrieve interviews
   */
  async retrieveInterviews(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    return this.retrieveByEntityType(DocumentEntityType.INTERVIEW, query, options);
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: number): Promise<RetrievalResultDto | null> {
    const document = await this.ragDocumentRepository.findOne({
      where: { documentId }
    });

    if (!document) {
      return null;
    }

    return {
      documentId: document.documentId,
      entityType: document.entityType,
      entityId: document.entityId,
      content: document.content,
      similarity: 1.0, // Perfect match for direct lookup
      metadata: document.metadata
    };
  }

  /**
   * Get documents by entity ID
   */
  async getDocumentsByEntity(
    entityType: DocumentEntityType,
    entityId: number
  ): Promise<RetrievalResultDto[]> {
    const documents = await this.ragDocumentRepository.find({
      where: { entityType, entityId }
    });

    return documents.map(doc => ({
      documentId: doc.documentId,
      entityType: doc.entityType,
      entityId: doc.entityId,
      content: doc.content,
      similarity: 1.0,
      metadata: doc.metadata
    }));
  }

  /**
   * Search with keyword fallback
   */
  async searchWithFallback(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    try {
      // Try vector search first
      const vectorResults = await this.retrieve(query, options);
      
      if (vectorResults.length > 0) {
        return vectorResults;
      }

      // Fallback to keyword search
      this.logger.log('Vector search returned no results, trying keyword search...');
      return await this.keywordSearch(query, options);
    } catch (error) {
      this.logger.error('Vector search failed, trying keyword search:', error);
      return await this.keywordSearch(query, options);
    }
  }

  /**
   * Keyword search fallback
   */
  private async keywordSearch(query: string, options: RetrievalOptions = {}): Promise<RetrievalResultDto[]> {
    const limit = options.limit || this.defaultLimit;
    const filters = options.filters || {};

    let queryBuilder = this.ragDocumentRepository
      .createQueryBuilder('doc')
      .where('doc.content ILIKE :query', { query: `%${query}%` })
      .orderBy('doc.updatedAt', 'DESC')
      .limit(limit);

    // Apply filters
    if (filters.entityTypes && filters.entityTypes.length > 0) {
      queryBuilder.andWhere('doc.entityType IN (:...entityTypes)', { entityTypes: filters.entityTypes });
    }

    if (filters.status) {
      queryBuilder.andWhere("doc.metadata->>'status' = :status", { status: filters.status });
    }

    if (filters.department) {
      queryBuilder.andWhere("doc.metadata->>'department' ILIKE :department", { department: `%${filters.department}%` });
    }

    const documents = await queryBuilder.getMany();

    return documents.map(doc => ({
      documentId: doc.documentId,
      entityType: doc.entityType,
      entityId: doc.entityId,
      content: doc.content,
      similarity: 0.5, // Default similarity for keyword matches
      metadata: doc.metadata
    }));
  }

  /**
   * Get retrieval statistics
   */
  async getRetrievalStats(): Promise<any> {
    const totalDocs = await this.ragDocumentRepository.count();
    const docsWithEmbeddings = await this.ragDocumentRepository.count({
      where: { embedding: Not(IsNull()) }
    });

    const entityTypeStats = await this.ragDocumentRepository
      .createQueryBuilder('doc')
      .select('doc.entityType, COUNT(*) as count')
      .groupBy('doc.entityType')
      .getRawMany();

    return {
      totalDocuments: totalDocs,
      documentsWithEmbeddings: docsWithEmbeddings,
      embeddingCoverage: totalDocs > 0 ? (docsWithEmbeddings / totalDocs) * 100 : 0,
      byEntityType: entityTypeStats.reduce((acc, stat) => {
        acc[stat.entityType] = parseInt(stat.count);
        return acc;
      }, {}),
      lastUpdated: new Date()
    };
  }
}
