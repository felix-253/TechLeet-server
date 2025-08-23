# CV Screening Module

## Overview

The CV Screening Module is an AI-powered system that automatically analyzes and scores candidate CVs against job requirements. It uses a combination of NLP processing, vector embeddings, and LLM analysis to provide comprehensive insights for HR teams.

## Features

- **Automated PDF Text Extraction**: Extracts text content from uploaded CV PDFs
- **NLP Processing**: Analyzes CV content to extract skills, experience, and education
- **Vector Similarity**: Uses OpenAI embeddings and pgvector for semantic similarity matching
- **AI-Powered Summaries**: Generates structured summaries and insights using LLM
- **Background Processing**: Uses BullMQ for scalable background job processing
- **Comprehensive Scoring**: Provides detailed scoring across multiple dimensions

## Architecture

### Pipeline Flow

1. **Text Extraction** → Extract text from PDF CV using pdf-parse
2. **NLP Processing** → Process text with chrono-node for dates, extract skills/experience
3. **Embedding Generation** → Create vector embeddings using OpenAI
4. **Similarity Calculation** → Compare CV and job description embeddings with pgvector
5. **LLM Analysis** → Generate AI summary and insights
6. **Score Calculation** → Combine all metrics into final scores

### Components

- **CvTextExtractionService**: PDF text extraction
- **CvNlpProcessingService**: Natural language processing
- **CvEmbeddingService**: Vector embeddings and similarity
- **CvLlmSummaryService**: AI-powered analysis
- **CvScreeningWorkerService**: Main pipeline orchestrator
- **CvQueueService**: Background job management
- **CvScreeningService**: API service layer

## Database Schema

### cv_screening_result
- Stores complete screening results
- Links to applications and job postings
- Contains scores, summaries, and metadata

### cv_embedding
- Stores vector embeddings for CVs and job descriptions
- Supports pgvector similarity queries
- Enables fast semantic search

### application (extended)
- Added screening-related fields
- Tracks screening status and completion

## API Endpoints

### Trigger Screening
```http
POST /api/cv-screening/trigger
{
  "applicationId": 123,
  "resumePath": "/path/to/resume.pdf",
  "priority": 5
}
```

### Get Screening Results
```http
GET /api/cv-screening/results?page=0&limit=10&status=completed&minScore=70
```

### Get Specific Result
```http
GET /api/cv-screening/result/1
GET /api/cv-screening/application/123
```

### Bulk Operations
```http
POST /api/cv-screening/bulk-trigger
{
  "applicationIds": [123, 124, 125],
  "priority": 5
}
```

### Statistics
```http
GET /api/cv-screening/stats?jobPostingId=456
```

### Queue Management
```http
GET /api/cv-screening/queue/status
POST /api/cv-screening/retry
POST /api/cv-screening/cancel/1
```

## Configuration

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# CV Screening Settings
CV_SCREENING_ENABLED=true
CV_SCREENING_AUTO_TRIGGER=true
CV_SCREENING_PRIORITY=0

# Redis/BullMQ Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Processing Configuration
CV_SCREENING_MAX_RETRIES=3
CV_SCREENING_RETRY_DELAY=2000
CV_SCREENING_TIMEOUT=300000

# Scoring Weights
CV_SCORING_VECTOR_WEIGHT=0.4
CV_SCORING_SKILLS_WEIGHT=0.3
CV_SCORING_EXPERIENCE_WEIGHT=0.2
CV_SCORING_EDUCATION_WEIGHT=0.1

# Scoring Thresholds
CV_SCORING_STRONG_FIT_THRESHOLD=80
CV_SCORING_GOOD_FIT_THRESHOLD=65
CV_SCORING_MODERATE_FIT_THRESHOLD=50
```

## Installation & Setup

### 1. Install Dependencies
```bash
pnpm add bullmq openai pdf-parse chrono-node pgvector @types/pdf-parse
```

### 2. Database Setup
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run migrations to create tables
-- Tables will be created automatically by TypeORM
```

### 3. Redis Setup
Ensure Redis is running for BullMQ queues:
```bash
redis-server
```

### 4. Environment Configuration
Copy `.env.example` to `.env` and configure:
- OpenAI API key
- Redis connection details
- Screening settings

## Usage

### Automatic Screening
When `CV_SCREENING_AUTO_TRIGGER=true`, screening is automatically triggered when:
- New application is created with resume URL
- Existing application's resume URL is updated

### Manual Screening
```typescript
// Trigger screening for specific application
await cvScreeningService.triggerScreening(applicationId);

// Bulk screening
await cvScreeningService.triggerBulkScreening([123, 124, 125]);

// Get results
const result = await cvScreeningService.getScreeningResult(screeningId);
```

### Queue Monitoring
```typescript
// Get queue status
const status = await cvQueueService.getQueueStats();

// Monitor specific job
const job = await cvQueueService.getJob(QueueNames.CV_PROCESSING, jobId);
```

## Scoring System

### Overall Score Calculation
```
Overall Score = (
  Vector Similarity × 0.4 +
  Skills Match × 0.3 +
  Experience Match × 0.2 +
  Education Match × 0.1
) × 100
```

### Score Interpretation
- **80-100**: Strong Fit - Highly recommended candidate
- **65-79**: Good Fit - Recommended with minor gaps
- **50-64**: Moderate Fit - Consider with reservations
- **0-49**: Poor Fit - Not recommended

## Error Handling

### Common Issues
1. **PDF Extraction Failure**: Invalid or corrupted PDF files
2. **OpenAI API Errors**: Rate limits, invalid API key, or service issues
3. **Database Errors**: Connection issues or constraint violations
4. **Queue Processing Errors**: Redis connection or worker failures

### Retry Logic
- Failed jobs are automatically retried up to 3 times
- Exponential backoff delay starting at 2 seconds
- Failed screenings can be manually retried via API

## Performance Considerations

### Optimization Tips
1. **Batch Processing**: Use bulk operations for multiple applications
2. **Queue Concurrency**: Adjust worker concurrency based on resources
3. **Embedding Caching**: Job embeddings are cached and reused
4. **Database Indexing**: Proper indexes on screening tables

### Monitoring
- Monitor queue lengths and processing times
- Track screening success/failure rates
- Monitor OpenAI API usage and costs
- Set up alerts for failed screenings

## Security

### Data Protection
- CV text is stored securely in the database
- OpenAI API calls use secure HTTPS
- Access control through JWT authentication
- Sensitive data is not logged

### API Security
- All endpoints require Bearer token authentication
- Input validation on all parameters
- Rate limiting on API endpoints
- Audit logging for screening activities

## Troubleshooting

### Common Problems

1. **Screening Stuck in Processing**
   - Check Redis connection
   - Verify worker processes are running
   - Check OpenAI API status

2. **Low Accuracy Scores**
   - Review scoring weights configuration
   - Check job description quality
   - Verify CV text extraction quality

3. **High Processing Times**
   - Monitor OpenAI API response times
   - Check database query performance
   - Review queue worker concurrency

### Debug Mode
Enable detailed logging by setting log level to debug in your environment.

## Future Enhancements

- Support for additional file formats (DOCX, TXT)
- Advanced NLP models for better skill extraction
- Machine learning model training on historical data
- Integration with external skill databases
- Real-time screening progress updates
- Advanced analytics and reporting dashboard
