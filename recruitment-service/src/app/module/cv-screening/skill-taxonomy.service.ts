import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as pgvector from 'pgvector';
import { SkillEntity, SkillCategory } from '../../../entities/recruitment/skill.entity';
import { SkillAliasEntity } from '../../../entities/recruitment/skill-alias.entity';
import { CvEmbeddingService } from './cv-embedding.service';

export interface SkillMatch {
   canonicalName: string;
   foundText: string;
   confidence: number;
   matchType: 'exact' | 'alias' | 'semantic';
   category: SkillCategory;
   skillId: number;
}

export interface SkillExtractionResult {
   matches: SkillMatch[];
   unmatchedTerms: string[];
   totalMatches: number;
   categories: Record<SkillCategory, SkillMatch[]>;
}

@Injectable()
export class SkillTaxonomyService implements OnModuleInit {
   private readonly logger = new Logger(SkillTaxonomyService.name);
   private skillCache: Map<string, SkillEntity> = new Map();
   private aliasCache: Map<string, SkillAliasEntity> = new Map();
   private cacheLoaded = false;

   constructor(
      @InjectRepository(SkillEntity)
      private readonly skillRepository: Repository<SkillEntity>,
      @InjectRepository(SkillAliasEntity)
      private readonly aliasRepository: Repository<SkillAliasEntity>,
      @Inject(forwardRef(() => CvEmbeddingService))
      private readonly embeddingService: CvEmbeddingService,
   ) {}

   async onModuleInit() {
      await this.loadSkillCache();
   }

   /**
    * Load skills and aliases into memory cache for fast lookup
    */
   async loadSkillCache(): Promise<void> {
      try {
         this.logger.log('Loading skill taxonomy cache...');

         // Load all active skills
         const skills = await this.skillRepository.find({
            where: { isActive: true },
            relations: ['aliases'],
         });

         // Load all active aliases
         const aliases = await this.aliasRepository.find({
            where: { isActive: true },
            relations: ['skill'],
         });

         // Build caches
         this.skillCache.clear();
         this.aliasCache.clear();

         // Cache skills by canonical name (case-insensitive)
         for (const skill of skills) {
            this.skillCache.set(skill.canonicalName.toLowerCase(), skill);
         }

         // Cache aliases by alias name (case-insensitive)
         for (const alias of aliases) {
            if (alias.skill && alias.skill.isActive) {
               this.aliasCache.set(alias.aliasName.toLowerCase(), alias);
            }
         }

         this.cacheLoaded = true;
         this.logger.log(`Loaded ${skills.length} skills and ${aliases.length} aliases into cache`);

      } catch (error) {
         this.logger.error(`Failed to load skill cache: ${error.message}`, error.stack);
         this.cacheLoaded = false;
      }
   }

   /**
    * Extract and match skills from text using taxonomy
    */
   async extractSkills(
      text: string,
      useSemanticMatching: boolean = true,
      semanticThreshold: number = 0.8
   ): Promise<SkillExtractionResult> {
      if (!this.cacheLoaded) {
         await this.loadSkillCache();
      }

      const matches: SkillMatch[] = [];
      const unmatchedTerms: string[] = [];
      const foundSkills = new Set<number>(); // Track unique skills to avoid duplicates

      // Extract potential skill terms from text
      const skillTerms = this.extractSkillTerms(text);

      for (const term of skillTerms) {
         const termLower = term.toLowerCase();
         let matched = false;

         // 1. Exact match with canonical name
         const exactSkill = this.skillCache.get(termLower);
         if (exactSkill && !foundSkills.has(exactSkill.skillId)) {
            matches.push({
               canonicalName: exactSkill.canonicalName,
               foundText: term,
               confidence: 1.0,
               matchType: 'exact',
               category: exactSkill.category,
               skillId: exactSkill.skillId,
            });
            foundSkills.add(exactSkill.skillId);
            matched = true;
         }

         // 2. Alias match
         if (!matched) {
            const alias = this.aliasCache.get(termLower);
            if (alias && alias.skill && !foundSkills.has(alias.skill.skillId)) {
               matches.push({
                  canonicalName: alias.skill.canonicalName,
                  foundText: term,
                  confidence: alias.confidence / 10, // Convert 1-10 scale to 0-1
                  matchType: 'alias',
                  category: alias.skill.category,
                  skillId: alias.skill.skillId,
               });
               foundSkills.add(alias.skill.skillId);
               matched = true;
            }
         }

         // 3. Semantic matching (if enabled and term is long enough)
         if (!matched && useSemanticMatching && term.length >= 3) {
            try {
               const semanticMatch = await this.findSemanticMatch(term, semanticThreshold);
               if (semanticMatch && !foundSkills.has(semanticMatch.skillId)) {
                  matches.push({
                     canonicalName: semanticMatch.canonicalName,
                     foundText: term,
                     confidence: semanticMatch.confidence,
                     matchType: 'semantic',
                     category: semanticMatch.category,
                     skillId: semanticMatch.skillId,
                  });
                  foundSkills.add(semanticMatch.skillId);
                  matched = true;
               }
            } catch (error) {
               this.logger.warn(`Semantic matching failed for term "${term}": ${error.message}`);
            }
         }

         if (!matched) {
            unmatchedTerms.push(term);
         }
      }

      // Group matches by category
      const categories: Record<SkillCategory, SkillMatch[]> = {} as any;
      for (const category of Object.values(SkillCategory)) {
         categories[category] = matches.filter(m => m.category === category);
      }

      const result: SkillExtractionResult = {
         matches,
         unmatchedTerms,
         totalMatches: matches.length,
         categories,
      };

      this.logger.log(`Extracted ${matches.length} skills from ${skillTerms.length} terms. Unmatched: ${unmatchedTerms.length}`);
      
      return result;
   }

   /**
    * Create a new skill in the taxonomy
    */
   async createSkill(
      canonicalName: string,
      category: SkillCategory,
      description?: string,
      aliases: string[] = [],
      generateEmbedding: boolean = true
   ): Promise<SkillEntity> {
      try {
         // Check if skill already exists
         const existing = await this.skillRepository.findOne({
            where: { canonicalName },
         });

         if (existing) {
            throw new Error(`Skill "${canonicalName}" already exists`);
         }

         // Generate embedding for semantic matching
         let embedding: string | undefined;
         if (generateEmbedding) {
            try {
               const embeddingText = `${canonicalName} ${description || ''}`.trim();
               const embeddingResult = await this.embeddingService.generateEmbedding(embeddingText);
               embedding = pgvector.toSql(embeddingResult.embedding);
            } catch (error) {
               this.logger.warn(`Failed to generate embedding for skill "${canonicalName}": ${error.message}`);
            }
         }

         // Create skill using raw SQL for vector support
         const skillQuery = `
            INSERT INTO skill (
               canonical_name, description, category, is_active, embedding, priority, metadata, created_at, updated_at
            ) VALUES (
               $1, $2, $3, $4, $5::vector, $6, $7, NOW(), NOW()
            )
            RETURNING *
         `;

         const skillResult = await this.skillRepository.query(skillQuery, [
            canonicalName,
            description || null,
            category,
            true,
            embedding || null,
            0,
            null,
         ]);

         const savedSkill = skillResult[0];
         const skillEntity = this.skillRepository.create({
            skillId: savedSkill.skill_id,
            canonicalName: savedSkill.canonical_name,
            description: savedSkill.description,
            category: savedSkill.category,
            isActive: savedSkill.is_active,
            embedding: savedSkill.embedding,
            priority: savedSkill.priority,
            metadata: savedSkill.metadata,
            createdAt: savedSkill.created_at,
            updatedAt: savedSkill.updated_at,
         });

         // Create aliases
         for (const aliasName of aliases) {
            if (aliasName.trim()) {
               await this.createAlias(skillEntity.skillId, aliasName.trim());
            }
         }

         // Refresh cache
         await this.loadSkillCache();

         this.logger.log(`Created skill "${canonicalName}" with ${aliases.length} aliases`);
         return skillEntity;

      } catch (error) {
         this.logger.error(`Failed to create skill "${canonicalName}": ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Create a new alias for a skill
    */
   async createAlias(
      skillId: number,
      aliasName: string,
      context?: string,
      confidence: number = 10
   ): Promise<SkillAliasEntity> {
      try {
         const alias = this.aliasRepository.create({
            skillId,
            aliasName,
            context,
            confidence,
            isActive: true,
         });

         const savedAlias = await this.aliasRepository.save(alias);
         this.logger.log(`Created alias "${aliasName}" for skill ID ${skillId}`);
         
         return savedAlias;

      } catch (error) {
         if (error.code === '23505') { // Unique constraint violation
            this.logger.warn(`Alias "${aliasName}" already exists for skill ID ${skillId}`);
            throw new Error(`Alias "${aliasName}" already exists for this skill`);
         }
         throw error;
      }
   }

   /**
    * Normalize job posting skills to canonical form
    */
   async normalizeJobSkills(skills: string[]): Promise<string[]> {
      const normalized: string[] = [];
      const seenSkills = new Set<number>();

      for (const skill of skills) {
         const skillLower = skill.toLowerCase().trim();
         
         // Check exact match
         const exactSkill = this.skillCache.get(skillLower);
         if (exactSkill && !seenSkills.has(exactSkill.skillId)) {
            normalized.push(exactSkill.canonicalName);
            seenSkills.add(exactSkill.skillId);
            continue;
         }

         // Check alias match
         const alias = this.aliasCache.get(skillLower);
         if (alias && alias.skill && !seenSkills.has(alias.skill.skillId)) {
            normalized.push(alias.skill.canonicalName);
            seenSkills.add(alias.skill.skillId);
            continue;
         }

         // If no match found, keep original (could be added to taxonomy later)
         normalized.push(skill);
      }

      return normalized;
   }

   /**
    * Get all skills by category
    */
   async getSkillsByCategory(category: SkillCategory): Promise<SkillEntity[]> {
      return this.skillRepository.find({
         where: { category, isActive: true },
         order: { priority: 'DESC', canonicalName: 'ASC' },
      });
   }

   /**
    * Search skills by name
    */
   async searchSkills(query: string, limit: number = 10): Promise<SkillEntity[]> {
      const queryLower = query.toLowerCase();
      
      // First try exact/alias matches from cache
      const cacheMatches: SkillEntity[] = [];
      
      for (const [name, skill] of this.skillCache.entries()) {
         if (name.includes(queryLower)) {
            cacheMatches.push(skill);
         }
      }

      for (const [aliasName, alias] of this.aliasCache.entries()) {
         if (aliasName.includes(queryLower) && alias.skill) {
            const exists = cacheMatches.find(s => s.skillId === alias.skill.skillId);
            if (!exists) {
               cacheMatches.push(alias.skill);
            }
         }
      }

      // Return cache matches if we have enough
      if (cacheMatches.length >= limit) {
         return cacheMatches.slice(0, limit);
      }

      // If not enough cache matches, try database search
      return this.skillRepository
         .createQueryBuilder('skill')
         .where('skill.isActive = true')
         .andWhere('LOWER(skill.canonicalName) LIKE :query OR LOWER(skill.description) LIKE :query', {
            query: `%${queryLower}%`
         })
         .orderBy('skill.priority', 'DESC')
         .addOrderBy('skill.canonicalName', 'ASC')
         .limit(limit)
         .getMany();
   }

   /**
    * Extract potential skill terms from text
    */
   private extractSkillTerms(text: string): string[] {
      // Basic extraction - can be enhanced with NLP
      const terms: string[] = [];
      
      // Split by common separators and clean
      const rawTerms = text
         .split(/[,;|&\n\r]+/)
         .flatMap(term => term.split(/\s+/))
         .map(term => term.trim().replace(/[^\w\s+#.-]/g, ''))
         .filter(term => term.length >= 2 && term.length <= 50);

      // Also extract multi-word terms (up to 3 words)
      const words = text.split(/\s+/).map(w => w.trim().replace(/[^\w+#.-]/g, ''));
      for (let i = 0; i < words.length; i++) {
         // Single word
         if (words[i].length >= 2) {
            terms.push(words[i]);
         }
         
         // Two words
         if (i + 1 < words.length) {
            const twoWord = `${words[i]} ${words[i + 1]}`;
            if (twoWord.length >= 3 && twoWord.length <= 50) {
               terms.push(twoWord);
            }
         }
         
         // Three words
         if (i + 2 < words.length) {
            const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            if (threeWord.length >= 4 && threeWord.length <= 50) {
               terms.push(threeWord);
            }
         }
      }

      // Remove duplicates and return
      return [...new Set(terms)];
   }

   /**
    * Find semantic match using embeddings
    */
   private async findSemanticMatch(
      term: string,
      threshold: number = 0.8
   ): Promise<SkillMatch | null> {
      try {
         // Generate embedding for the term
         const termEmbeddingResult = await this.embeddingService.generateEmbedding(term);
         const termEmbedding = pgvector.toSql(termEmbeddingResult.embedding);

         // Find most similar skill embeddings
         const results = await this.skillRepository.query(`
            SELECT
               skill_id,
               canonical_name,
               category,
               (1 - (embedding <=> $1::vector)) as similarity
            FROM skill
            WHERE embedding IS NOT NULL
               AND is_active = true
               AND (1 - (embedding <=> $1::vector)) >= $2
            ORDER BY embedding <=> $1::vector
            LIMIT 1
         `, [termEmbedding, threshold]);

         if (results.length === 0) {
            return null;
         }

         const result = results[0];
         return {
            canonicalName: result.canonical_name,
            foundText: term,
            confidence: parseFloat(result.similarity),
            matchType: 'semantic',
            category: result.category,
            skillId: result.skill_id,
         };

      } catch (error) {
         this.logger.warn(`Semantic matching failed for "${term}": ${error.message}`);
         return null;
      }
   }
}
