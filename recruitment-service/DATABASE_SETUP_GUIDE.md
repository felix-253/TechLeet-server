# Database Setup & Migration Guide

## 🔍 **Issue Identified**

The entities are not being updated in the database because:
1. **`synchronize: false`** in database config (production safety)
2. **No migration system** set up
3. **Missing database schema** for new entities

## 🛠️ **Solutions**

### Option 1: Quick Fix (Development Only)
Enable synchronize temporarily for development:

```typescript
// src/config/database.config.ts
synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true), // Enable for dev
```

Set in your `.env`:
```bash
DB_SYNCHRONIZE=true
```

**⚠️ Warning**: Only use this in development! Never in production.

### Option 2: Proper Migration System (Recommended)

#### Step 1: Install TypeORM CLI
```bash
npm install -g typeorm
# or use npx for project-specific
```

#### Step 2: Generate Initial Migration
```bash
# Generate migration based on current entities
npm run migration:generate src/migrations/InitialSchema

# Or create empty migration
npm run migration:create src/migrations/InitialSchema
```

#### Step 3: Run Migration
```bash
npm run migration:run
```

### Option 3: Manual Database Setup

#### Connect to PostgreSQL and run:
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create application table
CREATE TABLE IF NOT EXISTS application (
    application_id SERIAL PRIMARY KEY,
    cover_letter TEXT,
    resume_url VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reviewed_date DATE,
    review_notes TEXT,
    score INTEGER,
    feedback TEXT,
    offer_date DATE,
    offered_salary DECIMAL(10,2),
    offer_expiry_date DATE,
    offer_status VARCHAR(50),
    offer_response_date DATE,
    rejection_reason TEXT,
    expected_start_date DATE,
    application_notes TEXT,
    priority VARCHAR(50),
    tags TEXT,
    job_posting_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    reviewed_by INTEGER,
    hiring_manager_id INTEGER,
    is_screening_completed BOOLEAN DEFAULT FALSE,
    screening_score DECIMAL(5,2),
    screening_status VARCHAR(50),
    screening_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create CV screening result table
CREATE TABLE IF NOT EXISTS cv_screening_result (
    screening_id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    job_posting_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    overall_score DECIMAL(5,2),
    skills_score DECIMAL(5,2),
    experience_score DECIMAL(5,2),
    education_score DECIMAL(5,2),
    ai_summary TEXT,
    key_highlights TEXT,
    concerns TEXT,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create CV embedding table
CREATE TABLE IF NOT EXISTS cv_embedding (
    embedding_id SERIAL PRIMARY KEY,
    application_id INTEGER,
    job_posting_id INTEGER,
    embedding_type VARCHAR(50) NOT NULL,
    original_text TEXT NOT NULL,
    embedding VARCHAR NOT NULL, -- pgvector format
    model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    dimensions INTEGER NOT NULL DEFAULT 1536,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create candidate table
CREATE TABLE IF NOT EXISTS candidate (
    candidate_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    nationality VARCHAR(100),
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create job posting table
CREATE TABLE IF NOT EXISTS job_posting (
    job_posting_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    skills TEXT,
    experience_level VARCHAR(50),
    min_experience INTEGER,
    max_experience INTEGER,
    education_level VARCHAR(100),
    location VARCHAR(255),
    employment_type VARCHAR(50),
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create file table
CREATE TABLE IF NOT EXISTS file (
    file_id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_by INTEGER,
    application_id INTEGER,
    candidate_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create interview table
CREATE TABLE IF NOT EXISTS interview (
    interview_id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    interview_type VARCHAR(50) NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    interviewer_id INTEGER,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    feedback TEXT,
    score INTEGER,
    recommendation VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_application_status ON application(status);
CREATE INDEX IF NOT EXISTS idx_application_applied_date ON application(applied_date);
CREATE INDEX IF NOT EXISTS idx_application_job_candidate ON application(job_posting_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_screening_application ON cv_screening_result(application_id);
CREATE INDEX IF NOT EXISTS idx_cv_embedding_application ON cv_embedding(application_id);
CREATE INDEX IF NOT EXISTS idx_cv_embedding_job ON cv_embedding(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidate_email ON candidate(email);
CREATE INDEX IF NOT EXISTS idx_job_posting_active ON job_posting(is_active);
CREATE INDEX IF NOT EXISTS idx_interview_application ON interview(application_id);
```

## 🔧 **Quick Database Check Commands**

### Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('application', 'cv_screening_result', 'cv_embedding', 'candidate', 'job_posting');
```

### Check pgvector extension:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Check table structure:
```sql
\d application
\d cv_screening_result
\d cv_embedding
```

## 🚀 **Recommended Approach**

1. **For Development**: Use Option 1 (enable synchronize)
2. **For Production**: Use Option 2 (migration system)
3. **For Quick Setup**: Use Option 3 (manual SQL)

## 📝 **Environment Variables**

Add to your `.env` file:
```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=tech-leet

# Development only - enable auto-sync
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Production - use migrations
# DB_SYNCHRONIZE=false
# DB_LOGGING=false
```

## ✅ **Verification Steps**

After setup, verify with:
```bash
# 1. Check if service starts without errors
npm run start:dev

# 2. Test API endpoints
curl -X GET http://localhost:3033/api/candidates

# 3. Check database connection
curl -X GET http://localhost:3033/health
```

Choose the approach that best fits your environment!
