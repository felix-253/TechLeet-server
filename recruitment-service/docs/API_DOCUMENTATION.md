# Recruitment Service API Documentation

## Overview

The Recruitment Service manages the complete hiring process from job posting creation to candidate hiring. It provides comprehensive APIs for job postings, candidate management, application tracking, and interview scheduling.

## Base URL
```
http://localhost:3003/api
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints Summary

### Job Postings
- `POST /job-postings` - Create job posting
- `GET /job-postings` - List job postings with filtering
- `GET /job-postings/active` - Get active job postings
- `GET /job-postings/by-department/:id` - Get by department
- `GET /job-postings/by-position/:id` - Get by position
- `GET /job-postings/:id` - Get specific job posting
- `PATCH /job-postings/:id` - Update job posting
- `PATCH /job-postings/:id/publish` - Publish job posting
- `PATCH /job-postings/:id/close` - Close job posting
- `DELETE /job-postings/:id` - Delete job posting

### Candidates
- `POST /candidates` - Create candidate profile
- `GET /candidates` - List candidates with filtering
- `GET /candidates/by-status/:status` - Get by status
- `GET /candidates/by-skills` - Get by skills
- `GET /candidates/:id` - Get specific candidate
- `PATCH /candidates/:id` - Update candidate
- `PATCH /candidates/:id/status` - Update candidate status
- `DELETE /candidates/:id` - Delete candidate

### Applications
- `POST /applications` - Create application
- `GET /applications` - List applications with filtering
- `GET /applications/by-job-posting/:id` - Get by job posting
- `GET /applications/by-candidate/:id` - Get by candidate
- `GET /applications/:id` - Get specific application
- `PATCH /applications/:id` - Update application
- `PATCH /applications/:id/status` - Update application status
- `POST /applications/:id/make-offer` - Make job offer
- `POST /applications/:id/respond-offer` - Respond to offer
- `DELETE /applications/:id` - Delete application

### Interviews
- `POST /interviews` - Schedule interview
- `GET /interviews` - List interviews with filtering
- `GET /interviews/upcoming` - Get upcoming interviews
- `GET /interviews/by-application/:id` - Get by application
- `GET /interviews/by-interviewer/:id` - Get by interviewer
- `GET /interviews/:id` - Get specific interview
- `PATCH /interviews/:id` - Update interview
- `PATCH /interviews/:id/status` - Update interview status
- `POST /interviews/:id/complete` - Complete interview
- `DELETE /interviews/:id` - Delete interview

## Detailed API Specifications

### Job Postings API

#### Create Job Posting
```http
POST /job-postings
Content-Type: application/json

{
  "title": "Senior Full Stack Developer",
  "description": "We are looking for a Senior Full Stack Developer...",
  "requirements": "Bachelor degree in Computer Science, 5+ years experience...",
  "benefits": "Health insurance, flexible working hours...",
  "salaryMin": 30000000,
  "salaryMax": 50000000,
  "vacancies": 2,
  "applicationDeadline": "2024-12-31",
  "location": "Ho Chi Minh City",
  "employmentType": "full-time",
  "experienceLevel": "senior",
  "skills": "React, Node.js, TypeScript, PostgreSQL",
  "minExperience": 3,
  "maxExperience": 8,
  "educationLevel": "Bachelor degree in Computer Science",
  "departmentId": 1,
  "positionId": 1,
  "hiringManagerId": 1
}
```

#### Response
```json
{
  "jobPostingId": 1,
  "title": "Senior Full Stack Developer",
  "description": "We are looking for a Senior Full Stack Developer...",
  "requirements": "Bachelor degree in Computer Science, 5+ years experience...",
  "benefits": "Health insurance, flexible working hours...",
  "salaryMin": 30000000,
  "salaryMax": 50000000,
  "vacancies": 2,
  "applicationDeadline": "2024-12-31",
  "status": "draft",
  "location": "Ho Chi Minh City",
  "employmentType": "full-time",
  "experienceLevel": "senior",
  "skills": "React, Node.js, TypeScript, PostgreSQL",
  "minExperience": 3,
  "maxExperience": 8,
  "educationLevel": "Bachelor degree in Computer Science",
  "departmentId": 1,
  "positionId": 1,
  "hiringManagerId": 1,
  "salaryRange": "30,000,000 - 50,000,000 VND",
  "isJobActive": false,
  "daysUntilDeadline": 45,
  "applicationCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### List Job Postings with Filtering
```http
GET /job-postings?page=0&limit=10&keyword=developer&status=published&departmentId=1&employmentType=full-time&sortBy=createdAt&sortOrder=DESC
```

#### Publish Job Posting
```http
PATCH /job-postings/1/publish
```

### Candidates API

#### Create Candidate
```http
POST /candidates
Content-Type: application/json

{
  "firstName": "Nguyen",
  "lastName": "Van A",
  "email": "nguyenvana@email.com",
  "phoneNumber": "+84 901 234 567",
  "birthDate": "1995-05-15",
  "gender": true,
  "address": "123 Le Loi Street, District 1, Ho Chi Minh City",
  "resumeUrl": "https://storage.example.com/resumes/candidate-123.pdf",
  "linkedinUrl": "https://linkedin.com/in/nguyenvana",
  "githubUrl": "https://github.com/nguyenvana",
  "portfolioUrl": "https://nguyenvana.dev",
  "summary": "Experienced full-stack developer with 5+ years in React and Node.js...",
  "yearsOfExperience": 5,
  "currentJobTitle": "Senior Software Engineer",
  "currentCompany": "Tech Solutions Vietnam",
  "educationLevel": "Bachelor degree",
  "fieldOfStudy": "Computer Science",
  "university": "University of Technology Ho Chi Minh City",
  "graduationYear": 2018,
  "skills": "React, Node.js, TypeScript, PostgreSQL, Docker",
  "programmingLanguages": "JavaScript, TypeScript, Python, Java",
  "expectedSalary": 35000000,
  "preferredEmploymentType": "full-time",
  "availableForRemote": true,
  "availableStartDate": "2024-02-01",
  "source": "LinkedIn"
}
```

#### Response
```json
{
  "candidateId": 1,
  "firstName": "Nguyen",
  "lastName": "Van A",
  "email": "nguyenvana@email.com",
  "phoneNumber": "+84 901 234 567",
  "birthDate": "1995-05-15",
  "gender": true,
  "address": "123 Le Loi Street, District 1, Ho Chi Minh City",
  "resumeUrl": "https://storage.example.com/resumes/candidate-123.pdf",
  "linkedinUrl": "https://linkedin.com/in/nguyenvana",
  "githubUrl": "https://github.com/nguyenvana",
  "portfolioUrl": "https://nguyenvana.dev",
  "status": "new",
  "appliedDate": "2024-01-15",
  "summary": "Experienced full-stack developer with 5+ years in React and Node.js...",
  "yearsOfExperience": 5,
  "currentJobTitle": "Senior Software Engineer",
  "currentCompany": "Tech Solutions Vietnam",
  "educationLevel": "Bachelor degree",
  "fieldOfStudy": "Computer Science",
  "university": "University of Technology Ho Chi Minh City",
  "graduationYear": 2018,
  "skills": "React, Node.js, TypeScript, PostgreSQL, Docker",
  "programmingLanguages": "JavaScript, TypeScript, Python, Java",
  "expectedSalary": 35000000,
  "preferredEmploymentType": "full-time",
  "availableForRemote": true,
  "availableStartDate": "2024-02-01",
  "source": "LinkedIn",
  "fullName": "Nguyen Van A",
  "age": 28,
  "formattedExpectedSalary": "35,000,000 VND",
  "applicationCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Search Candidates by Skills
```http
GET /candidates/by-skills?skills=React,Node.js,TypeScript
```

### Applications API

#### Create Application
```http
POST /applications
Content-Type: application/json

{
  "jobPostingId": 1,
  "candidateId": 1,
  "coverLetter": "Dear Hiring Manager, I am excited to apply for the Senior Full Stack Developer position...",
  "resumeUrl": "https://storage.example.com/applications/resume-123.pdf",
  "expectedStartDate": "2024-03-01"
}
```

#### Make Job Offer
```http
POST /applications/1/make-offer
Content-Type: application/json

{
  "offeredSalary": 45000000,
  "offerExpiryDate": "2024-02-22"
}
```

#### Respond to Offer
```http
POST /applications/1/respond-offer
Content-Type: application/json

{
  "response": "accepted"
}
```

### Interviews API

#### Schedule Interview
```http
POST /interviews
Content-Type: application/json

{
  "applicationId": 1,
  "interviewType": "technical",
  "scheduledDate": "2024-01-25T14:00:00Z",
  "durationMinutes": 60,
  "location": "Meeting Room A, 5th Floor, TechLeet Office",
  "meetingLink": "https://zoom.us/j/123456789",
  "agenda": "Technical assessment, system design discussion, Q&A session",
  "interviewerId": 1,
  "secondaryInterviewerId": 2
}
```

#### Complete Interview
```http
POST /interviews/1/complete
Content-Type: application/json

{
  "score": 8,
  "feedback": "Strong technical skills, good communication, fits team culture well.",
  "result": "pass",
  "strengths": "Excellent problem-solving approach, clear communication",
  "weaknesses": "Could improve knowledge of advanced algorithms",
  "recommendForNextRound": true
}
```

## Status Workflows

### Job Posting Status Flow
```
draft → published → closed
       ↓
    cancelled
```

### Candidate Status Flow
```
new → screening → interviewing → hired
                              → rejected
                              → withdrawn
```

### Application Status Flow
```
submitted → screening → interviewing → offer → hired
                                            → rejected
                                            → withdrawn
```

### Interview Status Flow
```
scheduled → confirmed → in-progress → completed
                                   → cancelled
                                   → no-show
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Job posting with ID 1 not found",
  "error": "Not Found"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Query Parameters

### Pagination
- `page`: Page number (0-based, default: 0)
- `limit`: Items per page (1-100, default: 10)

### Sorting
- `sortBy`: Field to sort by
- `sortOrder`: ASC or DESC (default: DESC)

### Filtering
Each endpoint supports specific filters relevant to the entity type.

## Vietnamese Localization

- **Phone Numbers**: Validated for Vietnamese format (+84 xxx xxx xxx)
- **Salary Formatting**: Vietnamese number format (35,000,000 VND)
- **Date/Time**: Vietnam timezone (Asia/Ho_Chi_Minh)
- **Currency**: All salaries in Vietnamese Dong (VND)

## Business Rules

1. **Job Postings**: Must have future deadline to be published
2. **Applications**: One application per candidate per job posting
3. **Interviews**: No scheduling conflicts for interviewers
4. **Offers**: Must have expiration date in the future
5. **Status Transitions**: Follow defined workflows

## Rate Limiting

- 100 requests per minute per user
- 1000 requests per minute per service

## Swagger Documentation

Access interactive API documentation at:
```
http://localhost:3003/api/docs
```
