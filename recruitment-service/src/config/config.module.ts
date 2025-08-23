import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: [`.env.development`, '.env', '.env.firebase'],
         validationSchema: Joi.object({
            PORT: Joi.number().default(3033),
            HOST: Joi.string().default('localhost'),

            // Database Configuration
            DATABASE_HOST: Joi.string().default('localhost'),
            DATABASE_PORT: Joi.number().default(5432),
            DATABASE_USER: Joi.string().default('postgres'),
            DATABASE_PASSWORD: Joi.string().default('password'),
            DATABASE_NAME: Joi.string().default('tech-leet'),
            DB_SYNCHRONIZE: Joi.boolean().default(false),
            DB_LOGGING: Joi.boolean().default(false),
            DB_SSL: Joi.boolean().default(false),

            // Redis Configuration
            REDIS_HOST: Joi.string().default('localhost'),
            REDIS_PORT: Joi.number().default(6379),
            REDIS_PASSWORD: Joi.string().optional(),
            REDIS_DB: Joi.number().default(0),

            // JWT Configuration
            JWT_SECRET: Joi.string().required(),

            // API Gateway
            API_GATEWAY_URL: Joi.string().default('http://localhost:3030'),

            // OpenAI Configuration
            OPENAI_API_KEY: Joi.string().optional(),
            OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
            OPENAI_EMBEDDING_MODEL: Joi.string().default('text-embedding-3-small'),
            OPENAI_MAX_TOKENS: Joi.number().default(1500),
            OPENAI_TEMPERATURE: Joi.number().default(0.3),

            // CV Screening Configuration
            CV_SCREENING_ENABLED: Joi.boolean().default(true),
            CV_SCREENING_AUTO_TRIGGER: Joi.boolean().default(true),
            CV_SCREENING_PRIORITY: Joi.number().default(0),
            CV_SCREENING_MAX_RETRIES: Joi.number().default(3),
            CV_SCREENING_RETRY_DELAY: Joi.number().default(2000),
            CV_SCREENING_TIMEOUT: Joi.number().default(300000),

            // CV Scoring Configuration
            CV_SCORING_VECTOR_WEIGHT: Joi.number().default(0.4),
            CV_SCORING_SKILLS_WEIGHT: Joi.number().default(0.3),
            CV_SCORING_EXPERIENCE_WEIGHT: Joi.number().default(0.2),
            CV_SCORING_EDUCATION_WEIGHT: Joi.number().default(0.1),
            CV_SCORING_STRONG_FIT_THRESHOLD: Joi.number().default(80),
            CV_SCORING_GOOD_FIT_THRESHOLD: Joi.number().default(65),
            CV_SCORING_MODERATE_FIT_THRESHOLD: Joi.number().default(50),

            // File Upload Configuration
            FILE_UPLOAD_MAX_SIZE: Joi.number().default(10485760),
            FILE_UPLOAD_PATH: Joi.string().default('./uploads'),
         }),
      }),
   ],
   providers: [],
   exports: [],
})
export class ConfigAppsModule {}
