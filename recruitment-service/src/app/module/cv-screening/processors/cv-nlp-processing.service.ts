import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import * as chrono from 'chrono-node';

export interface WorkExperience {
   company?: string;
   position?: string;
   startDate?: Date;
   endDate?: Date;
   duration?: string;
   durationInMonths?: number;
   description?: string;
   isCurrent?: boolean;
}

export interface Education {
   institution?: string;
   degree?: string;
   field?: string;
   graduationYear?: number;
   startYear?: number;
   gpa?: string;
   description?: string;
}

export interface ExtractedSkills {
   technical: string[];
   soft: string[];
   languages: string[];
   frameworks: string[];
   tools: string[];
   certifications: string[];
}

export interface ProcessedCvData {
   personalInfo: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
   };
   workExperience: WorkExperience[];
   education: Education[];
   skills: ExtractedSkills;
   totalExperienceMonths: number;
   totalExperienceYears: number;
   summary?: string;
   extractedDates: Date[];
   keyPhrases: string[];
}

@Injectable()
export class CvNlpProcessingService {
   private readonly logger = new Logger(CvNlpProcessingService.name);

   constructor(
      @Inject(forwardRef(() => {
         // Dynamic import to avoid circular dependency
         return require('./cv-llm-summary.service').CvLlmSummaryService;
      }))
      private readonly llmSummaryService?: any,
   ) {}
   
   /**
    * Process CV text and extract structured information using AI
    */
   async processCvText(text: string): Promise<ProcessedCvData> {
      this.logger.log('Starting AI-based CV text processing');
      
      const startTime = Date.now();
      
      try {
         // Use AI to extract structured data
         const result = await this.extractWithAI(text);
         
         const processingTime = Date.now() - startTime;
         this.logger.log(`AI processing completed in ${processingTime}ms`);

         return result;
      } catch (error) {
         this.logger.error(`AI processing failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Extract CV information using AI
    */
   private async extractWithAI(text: string): Promise<ProcessedCvData> {
      // If LLM service is available, use it for extraction
      if (this.llmSummaryService) {
         try {
            const result = await this.llmSummaryService.extractCvData(text);
            if (result) {
               return result;
            }
         } catch (error) {
            this.logger.warn(`LLM extraction failed, using fallback: ${error.message}`);
         }
      }
      
      // Fallback: return empty structure
      return {
         personalInfo: {
            name: undefined,
            email: undefined,
            phone: undefined,
            location: undefined,
         },
         workExperience: [],
         education: [],
         skills: {
            technical: [],
            soft: [],
            languages: [],
            frameworks: [],
            tools: [],
            certifications: [],
         },
         totalExperienceMonths: 0,
         totalExperienceYears: 0,
         extractedDates: [],
         keyPhrases: [],
      };
   }
}
