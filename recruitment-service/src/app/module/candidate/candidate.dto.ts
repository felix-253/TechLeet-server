import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
   IsString, 
   IsOptional, 
   IsNumber, 
   IsNotEmpty, 
   MinLength, 
   MaxLength, 
   IsEmail, 
   IsPhoneNumber,
   IsDateString,
   IsBoolean,
   IsInt,
   Min,
   Max,
   IsIn,
   IsUrl
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCandidateDto {
   @ApiProperty({
      description: 'Candidate first name',
      example: 'Nguyen',
      minLength: 2,
      maxLength: 50,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(2)
   @MaxLength(50)
   firstName: string;

   @ApiProperty({
      description: 'Candidate last name',
      example: 'Van A',
      minLength: 2,
      maxLength: 50,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(2)
   @MaxLength(50)
   lastName: string;

   @ApiProperty({
      description: 'Candidate email address',
      example: 'nguyenvana@email.com',
   })
   @IsEmail({}, { message: 'Please provide a valid email address' })
   @IsNotEmpty()
   email: string;

   @ApiProperty({
      description: 'Candidate phone number',
      example: '+84 901 234 567',
   })
   @IsString()
   @IsNotEmpty()
   @IsPhoneNumber('VN', { message: 'Please provide a valid Vietnamese phone number' })
   phoneNumber: string;

   @ApiPropertyOptional({
      description: 'Candidate date of birth (YYYY-MM-DD)',
      example: '1995-05-15',
   })
   @IsOptional()
   @IsDateString()
   birthDate?: string;

   @ApiPropertyOptional({
      description: 'Candidate gender (true=male, false=female)',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   gender?: boolean;

   @ApiPropertyOptional({
      description: 'Candidate residential address',
      example: '123 Le Loi Street, District 1, Ho Chi Minh City',
   })
   @IsOptional()
   @IsString()
   address?: string;

   @ApiPropertyOptional({
      description: 'URL to candidate resume/CV file',
      example: 'https://storage.example.com/resumes/candidate-123.pdf',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid URL' })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'LinkedIn profile URL',
      example: 'https://linkedin.com/in/nguyenvana',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid LinkedIn URL' })
   linkedinUrl?: string;

   @ApiPropertyOptional({
      description: 'GitHub profile URL',
      example: 'https://github.com/nguyenvana',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid GitHub URL' })
   githubUrl?: string;

   @ApiPropertyOptional({
      description: 'Portfolio website URL',
      example: 'https://nguyenvana.dev',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid portfolio URL' })
   portfolioUrl?: string;

   @ApiPropertyOptional({
      description: 'Summary or bio provided by candidate',
      example: 'Experienced full-stack developer with 5+ years in React and Node.js...',
   })
   @IsOptional()
   @IsString()
   summary?: string;

   @ApiPropertyOptional({
      description: 'Years of total work experience',
      example: 5,
      minimum: 0,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   yearsOfExperience?: number;

   @ApiPropertyOptional({
      description: 'Current job title',
      example: 'Senior Software Engineer',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   currentJobTitle?: string;

   @ApiPropertyOptional({
      description: 'Current company name',
      example: 'Tech Solutions Vietnam',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   currentCompany?: string;

   @ApiPropertyOptional({
      description: 'Highest education level',
      example: 'Bachelor degree',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   educationLevel?: string;

   @ApiPropertyOptional({
      description: 'Field of study or major',
      example: 'Computer Science',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   fieldOfStudy?: string;

   @ApiPropertyOptional({
      description: 'University or institution name',
      example: 'University of Technology Ho Chi Minh City',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   university?: string;

   @ApiPropertyOptional({
      description: 'Graduation year',
      example: 2018,
      minimum: 1950,
   })
   @IsOptional()
   @IsInt()
   @Min(1950)
   @Max(new Date().getFullYear() + 10)
   @Type(() => Number)
   graduationYear?: number;

   @ApiPropertyOptional({
      description: 'Technical skills (comma-separated)',
      example: 'React, Node.js, TypeScript, PostgreSQL, Docker',
   })
   @IsOptional()
   @IsString()
   skills?: string;

   @ApiPropertyOptional({
      description: 'Programming languages known',
      example: 'JavaScript, TypeScript, Python, Java',
   })
   @IsOptional()
   @IsString()
   programmingLanguages?: string;

   @ApiPropertyOptional({
      description: 'Expected salary (VND)',
      example: 35000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   expectedSalary?: number;

   @ApiPropertyOptional({
      description: 'Preferred employment type',
      example: 'full-time',
      enum: ['full-time', 'part-time', 'contract'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['full-time', 'part-time', 'contract'])
   preferredEmploymentType?: string;

   @ApiPropertyOptional({
      description: 'Whether candidate is available for remote work',
      example: true,
      default: false,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   availableForRemote?: boolean = false;

   @ApiPropertyOptional({
      description: 'Earliest available start date (YYYY-MM-DD)',
      example: '2024-02-01',
   })
   @IsOptional()
   @IsDateString()
   availableStartDate?: string;

   @ApiPropertyOptional({
      description: 'How candidate heard about the company',
      example: 'LinkedIn',
      maxLength: 50,
   })
   @IsOptional()
   @IsString()
   @MaxLength(50)
   source?: string;
}

export class UpdateCandidateDto {
   @ApiPropertyOptional({
      description: 'Candidate first name',
      example: 'Nguyen',
      minLength: 2,
      maxLength: 50,
   })
   @IsOptional()
   @IsString()
   @MinLength(2)
   @MaxLength(50)
   firstName?: string;

   @ApiPropertyOptional({
      description: 'Candidate last name',
      example: 'Van A',
      minLength: 2,
      maxLength: 50,
   })
   @IsOptional()
   @IsString()
   @MinLength(2)
   @MaxLength(50)
   lastName?: string;

   @ApiPropertyOptional({
      description: 'Candidate email address',
      example: 'nguyenvana@email.com',
   })
   @IsOptional()
   @IsEmail({}, { message: 'Please provide a valid email address' })
   email?: string;

   @ApiPropertyOptional({
      description: 'Candidate phone number',
      example: '+84 901 234 567',
   })
   @IsOptional()
   @IsString()
   @IsPhoneNumber('VN', { message: 'Please provide a valid Vietnamese phone number' })
   phoneNumber?: string;

   @ApiPropertyOptional({
      description: 'Candidate date of birth (YYYY-MM-DD)',
      example: '1995-05-15',
   })
   @IsOptional()
   @IsDateString()
   birthDate?: string;

   @ApiPropertyOptional({
      description: 'Candidate gender (true=male, false=female)',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   gender?: boolean;

   @ApiPropertyOptional({
      description: 'Candidate residential address',
      example: '123 Le Loi Street, District 1, Ho Chi Minh City',
   })
   @IsOptional()
   @IsString()
   address?: string;

   @ApiPropertyOptional({
      description: 'URL to candidate resume/CV file',
      example: 'https://storage.example.com/resumes/candidate-123.pdf',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid URL' })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'LinkedIn profile URL',
      example: 'https://linkedin.com/in/nguyenvana',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid LinkedIn URL' })
   linkedinUrl?: string;

   @ApiPropertyOptional({
      description: 'GitHub profile URL',
      example: 'https://github.com/nguyenvana',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid GitHub URL' })
   githubUrl?: string;

   @ApiPropertyOptional({
      description: 'Portfolio website URL',
      example: 'https://nguyenvana.dev',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid portfolio URL' })
   portfolioUrl?: string;

   @ApiPropertyOptional({
      description: 'Candidate status',
      example: 'screening',
      enum: ['new', 'screening', 'interviewing', 'hired', 'rejected', 'withdrawn'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['new', 'screening', 'interviewing', 'hired', 'rejected', 'withdrawn'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Summary or bio provided by candidate',
      example: 'Experienced full-stack developer with 5+ years in React and Node.js...',
   })
   @IsOptional()
   @IsString()
   summary?: string;

   @ApiPropertyOptional({
      description: 'Years of total work experience',
      example: 5,
      minimum: 0,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   yearsOfExperience?: number;

   @ApiPropertyOptional({
      description: 'Current job title',
      example: 'Senior Software Engineer',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   currentJobTitle?: string;

   @ApiPropertyOptional({
      description: 'Current company name',
      example: 'Tech Solutions Vietnam',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   currentCompany?: string;

   @ApiPropertyOptional({
      description: 'Highest education level',
      example: 'Bachelor degree',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   educationLevel?: string;

   @ApiPropertyOptional({
      description: 'Field of study or major',
      example: 'Computer Science',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   fieldOfStudy?: string;

   @ApiPropertyOptional({
      description: 'University or institution name',
      example: 'University of Technology Ho Chi Minh City',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   university?: string;

   @ApiPropertyOptional({
      description: 'Graduation year',
      example: 2018,
      minimum: 1950,
   })
   @IsOptional()
   @IsInt()
   @Min(1950)
   @Max(new Date().getFullYear() + 10)
   @Type(() => Number)
   graduationYear?: number;

   @ApiPropertyOptional({
      description: 'Technical skills (comma-separated)',
      example: 'React, Node.js, TypeScript, PostgreSQL, Docker',
   })
   @IsOptional()
   @IsString()
   skills?: string;

   @ApiPropertyOptional({
      description: 'Programming languages known',
      example: 'JavaScript, TypeScript, Python, Java',
   })
   @IsOptional()
   @IsString()
   programmingLanguages?: string;

   @ApiPropertyOptional({
      description: 'Expected salary (VND)',
      example: 35000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   expectedSalary?: number;

   @ApiPropertyOptional({
      description: 'Preferred employment type',
      example: 'full-time',
      enum: ['full-time', 'part-time', 'contract'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['full-time', 'part-time', 'contract'])
   preferredEmploymentType?: string;

   @ApiPropertyOptional({
      description: 'Whether candidate is available for remote work',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   availableForRemote?: boolean;

   @ApiPropertyOptional({
      description: 'Earliest available start date (YYYY-MM-DD)',
      example: '2024-02-01',
   })
   @IsOptional()
   @IsDateString()
   availableStartDate?: string;

   @ApiPropertyOptional({
      description: 'How candidate heard about the company',
      example: 'LinkedIn',
      maxLength: 50,
   })
   @IsOptional()
   @IsString()
   @MaxLength(50)
   source?: string;
}

export class CandidateResponseDto {
   @ApiProperty({
      description: 'Candidate ID',
      example: 1,
   })
   candidateId: number;

   @ApiProperty({
      description: 'Candidate first name',
      example: 'Nguyen',
   })
   firstName: string;

   @ApiProperty({
      description: 'Candidate last name',
      example: 'Van A',
   })
   lastName: string;

   @ApiProperty({
      description: 'Candidate email address',
      example: 'nguyenvana@email.com',
   })
   email: string;

   @ApiProperty({
      description: 'Candidate phone number',
      example: '+84 901 234 567',
   })
   phoneNumber: string;

   @ApiPropertyOptional({
      description: 'Candidate date of birth',
      example: '1995-05-15',
   })
   birthDate?: string;

   @ApiPropertyOptional({
      description: 'Candidate gender (true=male, false=female)',
      example: true,
   })
   gender?: boolean;

   @ApiPropertyOptional({
      description: 'Candidate residential address',
      example: '123 Le Loi Street, District 1, Ho Chi Minh City',
   })
   address?: string;

   @ApiPropertyOptional({
      description: 'URL to candidate resume/CV file',
      example: 'https://storage.example.com/resumes/candidate-123.pdf',
   })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'LinkedIn profile URL',
      example: 'https://linkedin.com/in/nguyenvana',
   })
   linkedinUrl?: string;

   @ApiPropertyOptional({
      description: 'GitHub profile URL',
      example: 'https://github.com/nguyenvana',
   })
   githubUrl?: string;

   @ApiPropertyOptional({
      description: 'Portfolio website URL',
      example: 'https://nguyenvana.dev',
   })
   portfolioUrl?: string;

   @ApiProperty({
      description: 'Candidate status',
      example: 'new',
   })
   status: string;

   @ApiProperty({
      description: 'Date when candidate first applied',
      example: '2024-01-15',
   })
   appliedDate: string;

   @ApiPropertyOptional({
      description: 'Summary or bio provided by candidate',
      example: 'Experienced full-stack developer with 5+ years in React and Node.js...',
   })
   summary?: string;

   @ApiPropertyOptional({
      description: 'Years of total work experience',
      example: 5,
   })
   yearsOfExperience?: number;

   @ApiPropertyOptional({
      description: 'Current job title',
      example: 'Senior Software Engineer',
   })
   currentJobTitle?: string;

   @ApiPropertyOptional({
      description: 'Current company name',
      example: 'Tech Solutions Vietnam',
   })
   currentCompany?: string;

   @ApiPropertyOptional({
      description: 'Highest education level',
      example: 'Bachelor degree',
   })
   educationLevel?: string;

   @ApiPropertyOptional({
      description: 'Field of study or major',
      example: 'Computer Science',
   })
   fieldOfStudy?: string;

   @ApiPropertyOptional({
      description: 'University or institution name',
      example: 'University of Technology Ho Chi Minh City',
   })
   university?: string;

   @ApiPropertyOptional({
      description: 'Graduation year',
      example: 2018,
   })
   graduationYear?: number;

   @ApiPropertyOptional({
      description: 'Technical skills',
      example: 'React, Node.js, TypeScript, PostgreSQL, Docker',
   })
   skills?: string;

   @ApiPropertyOptional({
      description: 'Programming languages known',
      example: 'JavaScript, TypeScript, Python, Java',
   })
   programmingLanguages?: string;

   @ApiPropertyOptional({
      description: 'Expected salary (VND)',
      example: 35000000,
   })
   expectedSalary?: number;

   @ApiPropertyOptional({
      description: 'Preferred employment type',
      example: 'full-time',
   })
   preferredEmploymentType?: string;

   @ApiPropertyOptional({
      description: 'Whether candidate is available for remote work',
      example: true,
   })
   availableForRemote?: boolean;

   @ApiPropertyOptional({
      description: 'Earliest available start date',
      example: '2024-02-01',
   })
   availableStartDate?: string;

   @ApiPropertyOptional({
      description: 'How candidate heard about the company',
      example: 'LinkedIn',
   })
   source?: string;

   @ApiPropertyOptional({
      description: 'Candidate full name',
      example: 'Nguyen Van A',
   })
   fullName?: string;

   @ApiPropertyOptional({
      description: 'Candidate age',
      example: 28,
   })
   age?: number;

   @ApiPropertyOptional({
      description: 'Formatted expected salary',
      example: '35,000,000 VND',
   })
   formattedExpectedSalary?: string;

   @ApiPropertyOptional({
      description: 'Number of applications submitted',
      example: 3,
   })
   applicationCount?: number;

   @ApiProperty({
      description: 'Creation timestamp',
      example: '2024-01-15T10:30:00Z',
   })
   createdAt: string;

   @ApiProperty({
      description: 'Last update timestamp',
      example: '2024-01-20T14:45:00Z',
   })
   updatedAt: string;
}

export class GetCandidatesQueryDto {
   @ApiPropertyOptional({
      description: 'Page number (0-based)',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   page?: number = 0;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 10,
      default: 10,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(100)
   @Type(() => Number)
   limit?: number = 10;

   @ApiPropertyOptional({
      description: 'Search keyword for name or email',
      example: 'nguyen',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Filter by status',
      example: 'new',
      enum: ['new', 'screening', 'interviewing', 'hired', 'rejected', 'withdrawn'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['new', 'screening', 'interviewing', 'hired', 'rejected', 'withdrawn'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Filter by minimum years of experience',
      example: 3,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   minExperience?: number;

   @ApiPropertyOptional({
      description: 'Filter by maximum years of experience',
      example: 8,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   maxExperience?: number;

   @ApiPropertyOptional({
      description: 'Filter by skills (comma-separated)',
      example: 'React,Node.js',
   })
   @IsOptional()
   @IsString()
   skills?: string;

   @ApiPropertyOptional({
      description: 'Filter by education level',
      example: 'Bachelor degree',
   })
   @IsOptional()
   @IsString()
   educationLevel?: string;

   @ApiPropertyOptional({
      description: 'Filter by preferred employment type',
      example: 'full-time',
      enum: ['full-time', 'part-time', 'contract'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['full-time', 'part-time', 'contract'])
   preferredEmploymentType?: string;

   @ApiPropertyOptional({
      description: 'Filter by remote availability',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   availableForRemote?: boolean;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'appliedDate',
      enum: ['candidateId', 'firstName', 'lastName', 'appliedDate', 'yearsOfExperience', 'expectedSalary'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['candidateId', 'firstName', 'lastName', 'appliedDate', 'yearsOfExperience', 'expectedSalary'])
   sortBy?: string = 'appliedDate';

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'DESC',
      enum: ['ASC', 'DESC'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['ASC', 'DESC'])
   sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
