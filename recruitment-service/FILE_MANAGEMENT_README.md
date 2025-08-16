# File Management System for HRM Microservices

This documentation explains how to use the comprehensive file management system that handles employee avatars, candidate resumes, company logos, and other file uploads in the HRM recruitment service.

## Overview

The file management system provides:

- **File Upload**: Secure file upload with type validation
- **File Storage**: Organized file storage by type (avatars, resumes, logos, etc.)
- **File Metadata**: Complete file information tracking (size, type, relationships)
- **File Relationships**: Link files to employees, candidates, companies, etc.
- **File Versioning**: Automatic archiving of old files when updated
- **Swagger Integration**: Full API documentation with file upload support

## File Types Supported

```typescript
enum FileType {
   EMPLOYEE_AVATAR = 'employee_avatar', // Employee profile pictures
   CANDIDATE_RESUME = 'candidate_resume', // Candidate CV/resume files
   COMPANY_LOGO = 'company_logo', // Company brand logos
   JOB_ATTACHMENT = 'job_attachment', // Job posting attachments
   APPLICATION_DOCUMENT = 'application_document', // Application documents
   GENERAL_DOCUMENT = 'general_document', // Other documents
}
```

## Entity Structure

### FileEntity

The main file entity that stores all file information:

```typescript
@Entity('files')
export class FileEntity {
   fileId: number; // Primary key
   originalName: string; // Original filename from upload
   fileName: string; // Unique stored filename
   fileUrl: string; // Full URL to access the file
   mimeType: string; // File MIME type
   fileSize: number; // File size in bytes
   fileType: FileType; // Category of the file
   referenceId?: number; // ID of related entity (employee, candidate, etc.)
   referenceType?: string; // Type of related entity
   uploadedBy: number; // ID of user who uploaded
   status: FileStatus; // active, archived, deleted
   description?: string; // Optional description
   metadata?: any; // Additional file metadata
   createdAt: Date; // Upload timestamp
   updatedAt: Date; // Last update timestamp
   deletedAt?: Date; // Soft delete timestamp
}
```

## API Endpoints

### General File Operations

#### Upload File

```http
POST /api/v1/recruitment-service/files/upload
Content-Type: multipart/form-data

{
  "file": <binary>,
  "fileType": "employee_avatar",
  "referenceId": 123,
  "referenceType": "employee",
  "description": "Professional headshot"
}
```

#### Get Files with Filters

```http
GET /api/v1/recruitment-service/files?fileType=employee_avatar&referenceId=123
```

#### Update File Metadata

```http
PUT /api/v1/recruitment-service/files/1
{
  "description": "Updated description",
  "referenceId": 456
}
```

#### Delete File

```http
DELETE /api/v1/recruitment-service/files/1
```

### Entity-Specific File Operations

#### Employee Avatar

```http
# Upload avatar
POST /api/v1/recruitment-service/employees/123/avatar
Content-Type: multipart/form-data

# Get current avatar
GET /api/v1/recruitment-service/employees/123/avatar
```

#### Candidate Resume

```http
# Upload resume
POST /api/v1/recruitment-service/candidates/456/resume
Content-Type: multipart/form-data

# Get all resumes
GET /api/v1/recruitment-service/candidates/456/resumes

# Get all candidate files
GET /api/v1/recruitment-service/candidates/456/files
```

#### Company Logo

```http
# Upload logo
POST /api/v1/recruitment-service/companies/789/logo
Content-Type: multipart/form-data

# Get current logo
GET /api/v1/recruitment-service/companies/789/logo
```

## File Upload Configuration

### Multer Configuration

The system uses different upload directories based on file type:

```typescript
const uploadPaths = {
   employee_avatar: './uploads/avatars',
   candidate_resume: './uploads/resumes',
   company_logo: './uploads/logos',
   job_attachment: './uploads/job-attachments',
   application_document: './uploads/applications',
   general_document: './uploads/documents',
};
```

### File Type Validation

Each file type has specific MIME type restrictions:

- **Avatars/Logos**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Resumes/Documents**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`
- **General**: Combination of image and document types

### File Size Limits

- Default limit: 10MB per file
- Configurable per file type if needed

## Using the File Service

### Basic File Operations

```typescript
import { FileService } from './services/file.service';

@Injectable()
export class YourService {
   constructor(private readonly fileService: FileService) {}

   // Create a file record
   async uploadFile(fileData: FileUploadData) {
      return await this.fileService.create(fileData);
   }

   // Get file by ID
   async getFile(id: number) {
      return await this.fileService.findById(id);
   }

   // Update employee avatar
   async updateAvatar(employeeId: number, fileData: FileUploadData) {
      return await this.fileService.updateEmployeeAvatar(employeeId, fileData);
   }

   // Get candidate resumes
   async getCandidateResumes(candidateId: number) {
      return await this.fileService.getCandidateResumes(candidateId);
   }
}
```

### File Queries with Filters

```typescript
// Get files by type
const avatars = await this.fileService.findWithFilters({
   fileType: FileType.EMPLOYEE_AVATAR,
   page: 1,
   limit: 10,
});

// Get files by reference
const candidateFiles = await this.fileService.findByReference(
   'candidate',
   candidateId,
   FileType.CANDIDATE_RESUME,
);
```

## Adding File Relationships to Existing Entities

### Example: Employee Entity with Avatar

```typescript
import { OneToMany } from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('employees')
export class EmployeeEntity extends BaseEntity {
   // ... existing fields ...

   // Add relationship to files
   @OneToMany(() => FileEntity, (file) => file.referenceId)
   files?: FileEntity[];

   // Virtual property for current avatar
   get currentAvatar(): FileEntity | null {
      return (
         this.files?.find(
            (f) =>
               f.referenceType === 'employee' &&
               f.fileType === FileType.EMPLOYEE_AVATAR &&
               f.status === FileStatus.ACTIVE,
         ) || null
      );
   }

   get avatarUrl(): string | null {
      return this.currentAvatar?.fileUrl || null;
   }
}
```

### Example: Candidate Entity with Resumes

```typescript
@Entity('candidates')
export class CandidateEntity extends BaseEntity {
   // ... existing fields ...

   @OneToMany(() => FileEntity, (file) => file.referenceId)
   files?: FileEntity[];

   get resumes(): FileEntity[] {
      return (
         this.files?.filter(
            (f) =>
               f.referenceType === 'candidate' &&
               f.fileType === FileType.CANDIDATE_RESUME &&
               f.status === FileStatus.ACTIVE,
         ) || []
      );
   }

   get latestResume(): FileEntity | null {
      const resumes = this.resumes;
      return resumes.length > 0 ? resumes[0] : null;
   }
}
```

## Swagger Integration

The file system includes comprehensive Swagger documentation:

### File Upload in Swagger UI

- Upload forms with file selection
- File type dropdown selection
- Metadata input fields
- Progress indicators
- Response with file URLs

### API Documentation Features

- Complete request/response schemas
- File type enumerations
- Example payloads
- Error response codes
- File size and type restrictions

## Security Considerations

1. **File Type Validation**: Only allowed MIME types are accepted
2. **File Size Limits**: Configurable size restrictions
3. **Path Traversal Protection**: Secure filename generation
4. **Authentication**: Bearer token required for all operations
5. **Authorization**: User permissions checked before file operations

## File Storage Strategy

### Directory Structure

```
uploads/
├── avatars/          # Employee profile pictures
├── resumes/          # Candidate resume files
├── logos/            # Company brand logos
├── job-attachments/  # Job posting files
├── applications/     # Application documents
└── documents/        # General documents
```

### Filename Generation

Files are stored with unique names to prevent conflicts:

```
{timestamp}-{random}-{sanitized_original_name}.{extension}
```

### File Versioning

- Old files are marked as `ARCHIVED` when replaced
- Physical files are retained for audit purposes
- Cleanup process removes old archived files after 30 days

## Error Handling

Common error scenarios and responses:

- **400 Bad Request**: Invalid file type, missing file, size exceeded
- **404 Not Found**: File not found, entity not found
- **409 Conflict**: Duplicate file upload attempt
- **500 Internal Server Error**: File system errors, database errors

## Performance Considerations

1. **File Streaming**: Large files are streamed rather than loaded into memory
2. **Lazy Loading**: File relationships are not loaded by default
3. **Indexing**: Database indexes on frequently queried fields
4. **Caching**: File metadata cached for frequently accessed files

## Monitoring and Maintenance

### File Statistics

```typescript
const stats = await this.fileService.getFileStats();
// Returns: totalFiles, totalSize, filesByType, averageFileSize
```

### Cleanup Operations

```typescript
// Remove old deleted files
const cleanedCount = await this.fileService.cleanupOldFiles(30); // 30 days
```

### Health Checks

- Disk space monitoring
- Upload directory accessibility
- Database connection status
- File integrity checks

## Integration with API Gateway

The file endpoints are automatically proxied through the API Gateway:

```http
# Direct access
POST http://localhost:3003/files/upload

# Through API Gateway
POST http://localhost:3030/api/v1/recruitment-service/files/upload
```

## Environment Configuration

Required environment variables:

```env
# File upload settings
FILE_UPLOAD_MAX_SIZE=10485760  # 10MB in bytes
FILE_UPLOAD_PATH=./uploads

# File service URLs
RECRUITMENT_SERVICE_URL=http://localhost:3003
BASE_URL=http://localhost:3030  # For generating file URLs
```

## Testing

### Unit Tests

Test the file service methods with mock data:

```typescript
describe('FileService', () => {
   it('should create file record', async () => {
      const fileData = {
         originalName: 'test.pdf',
         fileName: 'unique_test.pdf',
         fileUrl: '/uploads/test.pdf',
         mimeType: 'application/pdf',
         fileSize: 1024,
         fileType: FileType.GENERAL_DOCUMENT,
         uploadedBy: 1,
      };

      const result = await fileService.create(fileData);
      expect(result.fileId).toBeDefined();
   });
});
```

### Integration Tests

Test file upload endpoints with actual file uploads:

```typescript
describe('File Upload API', () => {
   it('should upload employee avatar', async () => {
      return request(app.getHttpServer())
         .post('/employees/1/avatar')
         .attach('file', 'test/fixtures/avatar.jpg')
         .field('description', 'Test avatar')
         .expect(201)
         .expect((res) => {
            expect(res.body.fileUrl).toContain('avatar.jpg');
         });
   });
});
```

This file management system provides a robust foundation for handling all file upload needs in your HRM microservices architecture, with proper security, documentation, and integration with your existing Swagger API Gateway setup.
