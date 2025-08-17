import { Injectable, Logger } from '@nestjs/common';
import * as chrono from 'chrono-node';

export interface WorkExperience {
   company?: string;
   position?: string;
   startDate?: Date;
   endDate?: Date;
   duration?: string;
   durationInMonths?: number;
   description?: string;
   isCurrent?: boolean;
}

export interface Education {
   institution?: string;
   degree?: string;
   field?: string;
   graduationYear?: number;
   startYear?: number;
   gpa?: string;
   description?: string;
}

export interface ExtractedSkills {
   technical: string[];
   soft: string[];
   languages: string[];
   frameworks: string[];
   tools: string[];
   certifications: string[];
}

export interface ProcessedCvData {
   personalInfo: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
   };
   workExperience: WorkExperience[];
   education: Education[];
   skills: ExtractedSkills;
   totalExperienceMonths: number;
   totalExperienceYears: number;
   summary?: string;
   extractedDates: Date[];
   keyPhrases: string[];
}

@Injectable()
export class CvNlpProcessingService {
   private readonly logger = new Logger(CvNlpProcessingService.name);

   // Common technical skills and frameworks
   private readonly technicalSkills = [
      // Programming Languages
      'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
      'scala', 'r', 'matlab', 'sql', 'html', 'css', 'sass', 'less',
      
      // Frameworks & Libraries
      'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js', 'express', 'fastify', 'nest.js', 'spring',
      'django', 'flask', 'laravel', 'symfony', 'rails', 'asp.net', 'blazor',
      
      // Databases
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'sqlite',
      
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github', 'terraform', 'ansible',
      
      // Tools & Technologies
      'git', 'webpack', 'vite', 'babel', 'eslint', 'prettier', 'jest', 'cypress', 'selenium', 'postman'
   ];

   private readonly softSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving', 'analytical thinking', 'creativity',
      'adaptability', 'time management', 'project management', 'mentoring', 'collaboration', 'innovation'
   ];

   private readonly programmingLanguages = [
      'english', 'vietnamese', 'chinese', 'japanese', 'korean', 'french', 'german', 'spanish', 'italian'
   ];

   /**
    * Process CV text and extract structured information
    */
   async processCvText(text: string): Promise<ProcessedCvData> {
      this.logger.log('Starting NLP processing of CV text');
      
      const startTime = Date.now();
      
      try {
         const result: ProcessedCvData = {
            personalInfo: this.extractPersonalInfo(text),
            workExperience: this.extractWorkExperience(text),
            education: this.extractEducation(text),
            skills: this.extractSkills(text),
            totalExperienceMonths: 0,
            totalExperienceYears: 0,
            extractedDates: this.extractDates(text),
            keyPhrases: this.extractKeyPhrases(text),
         };

         // Calculate total experience
         result.totalExperienceMonths = this.calculateTotalExperience(result.workExperience);
         result.totalExperienceYears = Math.round(result.totalExperienceMonths / 12 * 10) / 10;

         // Generate summary
         result.summary = this.generateSummary(result);

         const processingTime = Date.now() - startTime;
         this.logger.log(`NLP processing completed in ${processingTime}ms`);

         return result;
      } catch (error) {
         this.logger.error(`NLP processing failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Extract personal information from CV text
    */
   private extractPersonalInfo(text: string): ProcessedCvData['personalInfo'] {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const phoneRegex = /(\+84|84|0)?[1-9][0-9]{8,9}/g;
      
      const emails = text.match(emailRegex);
      const phones = text.match(phoneRegex);

      // Try to extract name (usually at the beginning of CV)
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const possibleName = lines[0]?.trim();
      
      // Simple name validation (2-4 words, each starting with capital letter)
      const nameRegex = /^[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}$/;
      const name = nameRegex.test(possibleName) ? possibleName : undefined;

      return {
         name,
         email: emails?.[0],
         phone: phones?.[0],
         location: this.extractLocation(text),
      };
   }

   /**
    * Extract work experience from CV text
    */
   private extractWorkExperience(text: string): WorkExperience[] {
      const experiences: WorkExperience[] = [];
      
      // Look for experience sections
      const experienceKeywords = ['experience', 'work history', 'employment', 'career', 'professional experience'];
      const sections = this.splitIntoSections(text);
      
      for (const section of sections) {
         if (experienceKeywords.some(keyword => 
            section.toLowerCase().includes(keyword)
         )) {
            const sectionExperiences = this.parseExperienceSection(section);
            experiences.push(...sectionExperiences);
         }
      }

      return experiences;
   }

   /**
    * Extract education from CV text
    */
   private extractEducation(text: string): Education[] {
      const education: Education[] = [];
      
      const educationKeywords = ['education', 'academic', 'university', 'college', 'degree', 'bachelor', 'master', 'phd'];
      const sections = this.splitIntoSections(text);
      
      for (const section of sections) {
         if (educationKeywords.some(keyword => 
            section.toLowerCase().includes(keyword)
         )) {
            const sectionEducation = this.parseEducationSection(section);
            education.push(...sectionEducation);
         }
      }

      return education;
   }

   /**
    * Extract skills from CV text
    */
   private extractSkills(text: string): ExtractedSkills {
      const lowerText = text.toLowerCase();
      
      const technical = this.technicalSkills.filter(skill => 
         lowerText.includes(skill.toLowerCase())
      );
      
      const soft = this.softSkills.filter(skill => 
         lowerText.includes(skill.toLowerCase())
      );
      
      const languages = this.programmingLanguages.filter(lang => 
         lowerText.includes(lang.toLowerCase())
      );

      return {
         technical,
         soft,
         languages,
         frameworks: technical.filter(skill => 
            ['react', 'angular', 'vue', 'express', 'django', 'spring'].includes(skill)
         ),
         tools: technical.filter(skill => 
            ['git', 'docker', 'kubernetes', 'jenkins'].includes(skill)
         ),
         certifications: this.extractCertifications(text),
      };
   }

   /**
    * Extract dates from text using chrono-node
    */
   private extractDates(text: string): Date[] {
      const parsedDates = chrono.parse(text);
      return parsedDates
         .map(parsed => parsed.start.date())
         .filter(date => date && date.getFullYear() > 1990 && date.getFullYear() <= new Date().getFullYear() + 1);
   }

   /**
    * Calculate total work experience in months
    */
   private calculateTotalExperience(experiences: WorkExperience[]): number {
      let totalMonths = 0;
      
      for (const exp of experiences) {
         if (exp.durationInMonths) {
            totalMonths += exp.durationInMonths;
         } else if (exp.startDate) {
            const endDate = exp.endDate || new Date();
            const months = this.calculateMonthsBetween(exp.startDate, endDate);
            totalMonths += months;
         }
      }
      
      return totalMonths;
   }

   /**
    * Helper methods
    */
   private extractLocation(text: string): string | undefined {
      const locationKeywords = ['address', 'location', 'city', 'ho chi minh', 'hanoi', 'da nang'];
      const lines = text.split('\n');
      
      for (const line of lines) {
         if (locationKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
            return line.trim();
         }
      }
      
      return undefined;
   }

   private splitIntoSections(text: string): string[] {
      // Split by common section headers
      const sectionHeaders = /\n(?=(?:EXPERIENCE|EDUCATION|SKILLS|WORK HISTORY|ACADEMIC|PROFESSIONAL)\b)/gi;
      return text.split(sectionHeaders);
   }

   private parseExperienceSection(section: string): WorkExperience[] {
      // This is a simplified parser - in production, you'd want more sophisticated parsing
      const experiences: WorkExperience[] = [];
      const lines = section.split('\n').filter(line => line.trim().length > 0);
      
      // Basic parsing logic would go here
      // For now, return empty array as this would require complex regex patterns
      
      return experiences;
   }

   private parseEducationSection(section: string): Education[] {
      // Similar to experience parsing
      return [];
   }

   private extractCertifications(text: string): string[] {
      const certKeywords = ['certified', 'certification', 'certificate', 'aws certified', 'microsoft certified'];
      const certifications: string[] = [];
      
      for (const keyword of certKeywords) {
         if (text.toLowerCase().includes(keyword)) {
            certifications.push(keyword);
         }
      }
      
      return certifications;
   }

   private extractKeyPhrases(text: string): string[] {
      // Extract important phrases (simplified implementation)
      const phrases = text.match(/\b(?:[A-Z][a-z]+ ){1,3}[A-Z][a-z]+\b/g) || [];
      return phrases.slice(0, 10); // Return top 10 phrases
   }

   private generateSummary(data: ProcessedCvData): string {
      const parts: string[] = [];
      
      if (data.totalExperienceYears > 0) {
         parts.push(`${data.totalExperienceYears} years of experience`);
      }
      
      if (data.skills.technical.length > 0) {
         parts.push(`skilled in ${data.skills.technical.slice(0, 3).join(', ')}`);
      }
      
      if (data.education.length > 0) {
         parts.push(`educated professional`);
      }
      
      return parts.join(', ') || 'Professional candidate';
   }

   private calculateMonthsBetween(startDate: Date, endDate: Date): number {
      const yearDiff = endDate.getFullYear() - startDate.getFullYear();
      const monthDiff = endDate.getMonth() - startDate.getMonth();
      return yearDiff * 12 + monthDiff;
   }
}
