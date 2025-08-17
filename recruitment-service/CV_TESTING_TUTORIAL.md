# CV Screening Flow Testing Tutorial

## 🚀 **Quick Start Guide**

### Prerequisites
1. **Environment Setup**
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Configure required variables
   GEMINI_API_KEY=your-gemini-api-key-here
   REDIS_HOST=localhost
   REDIS_PORT=6379
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   ```

2. **Database Setup**
   ```sql
   -- Connect to PostgreSQL and enable pgvector
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Tables will be auto-created by TypeORM
   ```

3. **Start Services**
   ```bash
   # Start Redis (required for BullMQ)
   redis-server
   
   # Start the recruitment service
   cd TechLeet-server-microservice/recruitment-service
   pnpm install
   pnpm run start:dev
   ```

## 🧪 **Testing the Complete CV Flow**

### Step 1: Create Test Data

#### 1.1 Create a Job Posting
```bash
curl -X POST http://localhost:3033/api/job-postings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Senior Full Stack Developer",
    "description": "We are looking for an experienced full-stack developer to join our team.",
    "requirements": "5+ years experience with React, Node.js, TypeScript, PostgreSQL",
    "skills": "React, Node.js, TypeScript, PostgreSQL, Docker, AWS",
    "experienceLevel": "Senior",
    "minExperience": 5,
    "maxExperience": 10,
    "educationLevel": "Bachelor degree in Computer Science or related field",
    "location": "Ho Chi Minh City, Vietnam",
    "employmentType": "Full-time",
    "salaryMin": 2000,
    "salaryMax": 3500,
    "currency": "USD",
    "isActive": true
  }'
```

#### 1.2 Create a Candidate
```bash
curl -X POST http://localhost:3033/api/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Nguyen",
    "lastName": "Van An",
    "email": "nguyen.van.an@example.com",
    "phone": "+84901234567",
    "address": "123 Le Loi Street, District 1, Ho Chi Minh City",
    "dateOfBirth": "1990-05-15",
    "nationality": "Vietnamese",
    "summary": "Experienced full-stack developer with 6 years in web development"
  }'
```

### Step 2: Test CV Upload and Automatic Screening

#### 2.1 Upload CV and Create Application
```bash
# First upload a CV file
curl -X POST http://localhost:3033/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/sample-cv.pdf" \
  -F "fileType=resume"

# Note the returned file URL, then create application
curl -X POST http://localhost:3033/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jobPostingId": 1,
    "candidateId": 1,
    "resumeUrl": "/api/uploads/resumes/sample-cv.pdf",
    "coverLetter": "I am very interested in this position...",
    "expectedSalary": 2500,
    "availableStartDate": "2024-02-01"
  }'
```

**Expected Result**: CV screening should automatically trigger when the application is created.

### Step 3: Monitor Screening Progress

#### 3.1 Check Queue Status
```bash
curl -X GET http://localhost:3033/api/cv-screening/queue/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 3.2 Check Screening Result
```bash
# Get screening by application ID
curl -X GET http://localhost:3033/api/cv-screening/application/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or get all screening results
curl -X GET "http://localhost:3033/api/cv-screening/results?page=0&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Manual Screening Trigger

#### 4.1 Trigger Screening Manually
```bash
curl -X POST http://localhost:3033/api/cv-screening/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "applicationId": 1,
    "priority": 5
  }'
```

#### 4.2 Bulk Screening
```bash
curl -X POST http://localhost:3033/api/cv-screening/bulk-trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "applicationIds": [1, 2, 3],
    "priority": 3
  }'
```

### Step 5: Test Error Handling

#### 5.1 Retry Failed Screening
```bash
curl -X POST http://localhost:3033/api/cv-screening/retry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "screeningId": 1,
    "force": false
  }'
```

#### 5.2 Cancel Screening
```bash
curl -X POST http://localhost:3033/api/cv-screening/cancel/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 **Understanding the Results**

### Screening Result Structure
```json
{
  "screeningId": 1,
  "applicationId": 1,
  "jobPostingId": 1,
  "status": "completed",
  "overallScore": 85.75,
  "skillsScore": 92.50,
  "experienceScore": 78.25,
  "educationScore": 88.00,
  "aiSummary": "Experienced software engineer with 6+ years in full-stack development. Strong technical skills in React, Node.js, and TypeScript. Good match for senior developer role.",
  "keyHighlights": [
    "6+ years of full-stack development experience",
    "Strong proficiency in React and Node.js",
    "Experience with TypeScript and modern web technologies",
    "Previous leadership experience"
  ],
  "concerns": [
    "Limited cloud platform experience",
    "No formal AWS certifications mentioned"
  ],
  "processingTimeMs": 15000,
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:15Z"
}
```

### Score Interpretation
- **80-100**: Strong Fit - Highly recommended
- **65-79**: Good Fit - Recommended with minor gaps
- **50-64**: Moderate Fit - Consider with reservations
- **0-49**: Poor Fit - Not recommended

## 🔧 **Testing with Sample Data**

### Create Sample CV Content
Create a sample PDF with this content for testing:

```
NGUYEN VAN AN
Senior Full Stack Developer
Email: nguyen.van.an@example.com
Phone: +84 901 234 567

EXPERIENCE
Senior Software Engineer | Tech Corp (2020-2024)
- Led development of React-based web applications
- Built RESTful APIs using Node.js and Express
- Worked with PostgreSQL and MongoDB databases
- Implemented CI/CD pipelines with Docker

Full Stack Developer | StartupXYZ (2018-2020)
- Developed responsive web applications using React
- Created backend services with Node.js
- Experience with TypeScript and modern JavaScript

EDUCATION
Bachelor of Computer Science
University of Technology, Ho Chi Minh City (2014-2018)

SKILLS
- Frontend: React, TypeScript, HTML5, CSS3, JavaScript
- Backend: Node.js, Express, NestJS
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Docker, Git, AWS (basic)
```

## 🐛 **Troubleshooting**

### Common Issues

1. **Gemini API Errors**
   ```bash
   # Check API key by testing a simple request
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

2. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   redis-cli ping
   ```

3. **PDF Processing Errors**
   - Ensure PDF is not password protected
   - Check file size (should be < 10MB)
   - Verify PDF is not corrupted

4. **Database Issues**
   ```sql
   -- Check if pgvector extension is enabled
   SELECT * FROM pg_extension WHERE extname = 'vector';
   
   -- Check tables exist
   \dt cv_*
   ```

## 📈 **Performance Testing**

### Load Testing
```bash
# Test bulk screening performance
for i in {1..10}; do
  curl -X POST http://localhost:3033/api/cv-screening/trigger \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d "{\"applicationId\": $i, \"priority\": 1}" &
done
wait
```

### Monitor Queue Performance
```bash
# Check queue statistics
curl -X GET http://localhost:3033/api/cv-screening/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 **Expected Flow Timeline**

1. **Application Created** (0s) → CV screening automatically triggered
2. **Text Extraction** (1-3s) → PDF content extracted
3. **NLP Processing** (2-5s) → Skills, experience, education parsed
4. **Embedding Generation** (3-8s) → Vector embeddings created
5. **Similarity Calculation** (1-2s) → Scores calculated
6. **AI Summary** (5-15s) → LLM generates insights
7. **Results Stored** (1s) → Complete results saved

**Total Time**: 13-34 seconds depending on CV complexity and API response times.

## 🔍 **Monitoring & Debugging**

### Check Logs
```bash
# View application logs
tail -f logs/recruitment-service.log

# Check specific screening logs
grep "CV screening" logs/recruitment-service.log
```

### Database Queries
```sql
-- Check screening results
SELECT * FROM cv_screening_result ORDER BY created_at DESC LIMIT 10;

-- Check embeddings
SELECT embedding_id, application_id, job_posting_id, embedding_type 
FROM cv_embedding ORDER BY created_at DESC LIMIT 10;

-- Check application screening status
SELECT application_id, is_screening_completed, screening_score, screening_status 
FROM application WHERE is_screening_completed = true;
```

This tutorial provides a complete testing workflow for the CV screening system. Follow these steps to verify that your implementation works correctly!
