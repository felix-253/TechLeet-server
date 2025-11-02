import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';

export class JobDescriptionUtil {
   static createJobDescriptionText(jobPosting: JobPostingEntity): string {
      const parts = [
         `Job Title: ${jobPosting.title || 'Software Engineer'}`,
         `Description: ${jobPosting.description || 'Software development position'}`,
         `Requirements: ${jobPosting.requirements || 'Software development skills required'}`,
         `Skills: ${jobPosting.skills || 'Programming skills'}`,
         `Experience Level: ${jobPosting.experienceLevel || `${jobPosting.minExperience || 2}-${jobPosting.maxExperience || 5} years`}`,
         `Education: ${jobPosting.educationLevel || 'Bachelor degree preferred'}`,
      ];

      return parts.filter(part => {
         const value = part.split(': ')[1];
         return value && value !== 'undefined';
      }).join('\n');
   }
}

