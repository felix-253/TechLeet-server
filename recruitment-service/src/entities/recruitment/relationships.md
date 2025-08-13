# Recruitment Entity Relationships

## To be added after all entities are created:

### JobPosting Entity
```typescript
// Add to job-posting.entity.ts
import { ApplicationEntity } from './application.entity';

// Add to class:
@OneToMany(() => ApplicationEntity, application => application.jobPosting, {
   cascade: ['soft-remove']
})
applications: ApplicationEntity[];
```

### Candidate Entity
```typescript
// Add to candidate.entity.ts
import { ApplicationEntity } from './application.entity';

// Add to class:
@OneToMany(() => ApplicationEntity, application => application.candidate, {
   cascade: ['soft-remove']
})
applications: ApplicationEntity[];
```

### Application Entity
```typescript
// Add to application.entity.ts
import { JobPostingEntity } from './job-posting.entity';
import { CandidateEntity } from './candidate.entity';
import { InterviewEntity } from './interview.entity';

// Add to class:
@ManyToOne(() => JobPostingEntity, jobPosting => jobPosting.applications, {
   onDelete: 'CASCADE'
})
@JoinColumn({ name: 'jobPostingId' })
jobPosting: JobPostingEntity;

@ManyToOne(() => CandidateEntity, candidate => candidate.applications, {
   onDelete: 'CASCADE'
})
@JoinColumn({ name: 'candidateId' })
candidate: CandidateEntity;

@OneToMany(() => InterviewEntity, interview => interview.application, {
   cascade: ['soft-remove']
})
interviews: InterviewEntity[];
```

### Interview Entity
```typescript
// Add to interview.entity.ts
import { ApplicationEntity } from './application.entity';

// Add to class:
@ManyToOne(() => ApplicationEntity, application => application.interviews, {
   onDelete: 'CASCADE'
})
@JoinColumn({ name: 'applicationId' })
application: ApplicationEntity;
```

## Field Name Changes Made:
- `notes` → `interviewNotes` (Interview entity)
- `notes` → `applicationNotes` (Application entity)
- `isActive` → `isJobActive` (JobPosting entity)

## Removed Duplicate Fields:
- `createdBy` (already in BaseEntity)
- `isActive` (already in BaseEntity)
