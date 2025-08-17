import { ConfigService } from '@nestjs/config';

export interface CvScreeningConfig {
   enabled: boolean;
   autoTrigger: boolean;
   defaultPriority: number;
   openai: {
      apiKey: string;
      model: string;
      embeddingModel: string;
      maxTokens: number;
      temperature: number;
   };
   processing: {
      maxRetries: number;
      retryDelay: number;
      timeout: number;
   };
   scoring: {
      weights: {
         vectorSimilarity: number;
         skillsMatch: number;
         experienceMatch: number;
         educationMatch: number;
      };
      thresholds: {
         strongFit: number;
         goodFit: number;
         moderateFit: number;
      };
   };
}

export const getCvScreeningConfig = (configService: ConfigService): CvScreeningConfig => ({
   enabled: configService.get<boolean>('CV_SCREENING_ENABLED', true),
   autoTrigger: configService.get<boolean>('CV_SCREENING_AUTO_TRIGGER', true),
   defaultPriority: configService.get<number>('CV_SCREENING_PRIORITY', 0),
   
   openai: {
      apiKey: configService.get<string>('OPENAI_API_KEY', ''),
      model: configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
      embeddingModel: configService.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
      maxTokens: configService.get<number>('OPENAI_MAX_TOKENS', 1500),
      temperature: configService.get<number>('OPENAI_TEMPERATURE', 0.3),
   },
   
   processing: {
      maxRetries: configService.get<number>('CV_SCREENING_MAX_RETRIES', 3),
      retryDelay: configService.get<number>('CV_SCREENING_RETRY_DELAY', 2000),
      timeout: configService.get<number>('CV_SCREENING_TIMEOUT', 300000), // 5 minutes
   },
   
   scoring: {
      weights: {
         vectorSimilarity: configService.get<number>('CV_SCORING_VECTOR_WEIGHT', 0.4),
         skillsMatch: configService.get<number>('CV_SCORING_SKILLS_WEIGHT', 0.3),
         experienceMatch: configService.get<number>('CV_SCORING_EXPERIENCE_WEIGHT', 0.2),
         educationMatch: configService.get<number>('CV_SCORING_EDUCATION_WEIGHT', 0.1),
      },
      thresholds: {
         strongFit: configService.get<number>('CV_SCORING_STRONG_FIT_THRESHOLD', 80),
         goodFit: configService.get<number>('CV_SCORING_GOOD_FIT_THRESHOLD', 65),
         moderateFit: configService.get<number>('CV_SCORING_MODERATE_FIT_THRESHOLD', 50),
      },
   },
});
