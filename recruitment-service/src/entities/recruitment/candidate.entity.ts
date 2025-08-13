import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';

@Entity('candidate')
@Index(['email'], { unique: true })
@Index(['phoneNumber'])
@Index(['status'])
export class CandidateEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the candidate'
   })
   candidateId: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: 'Candidate first name'
   })
   firstName: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: 'Candidate last name'
   })
   lastName: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Candidate email address'
   })
   email: string;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: false,
      comment: 'Candidate phone number'
   })
   phoneNumber: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Candidate date of birth'
   })
   birthDate?: Date;

   @Column({
      type: 'boolean',
      nullable: true,
      comment: 'Candidate gender (true=male, false=female)'
   })
   gender?: boolean;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Candidate residential address'
   })
   address?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'URL to candidate resume/CV file'
   })
   resumeUrl?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'LinkedIn profile URL'
   })
   linkedinUrl?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'GitHub profile URL'
   })
   githubUrl?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'Portfolio website URL'
   })
   portfolioUrl?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      default: 'new',
      comment: 'Candidate status (new, screening, interviewing, hired, rejected, withdrawn)'
   })
   status: string;

   @Column({
      type: 'date',
      nullable: false,
      default: () => 'CURRENT_DATE',
      comment: 'Date when candidate first applied'
   })
   appliedDate: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Summary or bio provided by candidate'
   })
   summary?: string;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Years of total work experience'
   })
   yearsOfExperience?: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'Current job title'
   })
   currentJobTitle?: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'Current company name'
   })
   currentCompany?: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'Highest education level'
   })
   educationLevel?: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'Field of study or major'
   })
   fieldOfStudy?: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'University or institution name'
   })
   university?: string;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Graduation year'
   })
   graduationYear?: number;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Technical skills (comma-separated or JSON)'
   })
   skills?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Programming languages known'
   })
   programmingLanguages?: string;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Expected salary (VND)'
   })
   expectedSalary?: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Preferred employment type (full-time, part-time, contract)'
   })
   preferredEmploymentType?: string;

   @Column({
      type: 'boolean',
      nullable: true,
      default: false,
      comment: 'Whether candidate is available for remote work'
   })
   availableForRemote?: boolean;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Earliest available start date'
   })
   availableStartDate?: Date;



   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'How candidate heard about the company'
   })
   source?: string;

   // Relationships will be added after ApplicationEntity is created
   // @OneToMany(() => ApplicationEntity, application => application.candidate, {
   //    cascade: ['soft-remove']
   // })
   // applications: ApplicationEntity[];

   // Computed properties
   get fullName(): string {
      return `${this.firstName} ${this.lastName}`;
   }

   get age(): number | null {
      if (!this.birthDate) return null;
      const today = new Date();
      const birthDate = new Date(this.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
         age--;
      }
      return age;
   }

   get formattedExpectedSalary(): string | null {
      if (!this.expectedSalary) return null;
      return new Intl.NumberFormat('vi-VN').format(this.expectedSalary) + ' VND';
   }
}
