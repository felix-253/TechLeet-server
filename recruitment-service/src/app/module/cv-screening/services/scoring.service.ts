import { Injectable } from '@nestjs/common';

export interface ScoringResult {
   overallScore: number;
   skillsScore: number;
   experienceScore: number;
   educationScore: number;
   vectorSimilarity: number;
   chunkSimilarity: number;
}

@Injectable()
export class ScoringService {
   /**
    * Calculate overall similarity score with weighting
    */
   calculateOverallScore(
      vectorSimilarity: number,
      skillsScore: number,
      experienceScore: number,
      educationScore: number,
      chunkSimilarity: number
   ): ScoringResult {
      const overallScore = (
         vectorSimilarity * 0.4 +
         skillsScore * 0.3 +
         experienceScore * 0.2 +
         educationScore * 0.1
      ) * 100;

      return {
         overallScore: Math.round(overallScore * 100) / 100,
         skillsScore: Math.round(skillsScore * 100 * 100) / 100,
         experienceScore: Math.round(experienceScore * 100 * 100) / 100,
         educationScore: Math.round(educationScore * 100 * 100) / 100,
         vectorSimilarity,
         chunkSimilarity,
      };
   }

   /**
    * Calculate skills match score
    */
   calculateSkillsMatchScore(cvSkills: string[], jobSkills: string): number {
      if (!jobSkills || cvSkills.length === 0) {
         return 0;
      }

      const jobSkillsArray = jobSkills.toLowerCase().split(/[,\s]+/).filter(s => s.length > 0);
      const cvSkillsLower = cvSkills.map(s => s.toLowerCase());

      const matchingSkills = jobSkillsArray.filter(skill =>
         cvSkillsLower.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
      );

      return jobSkillsArray.length > 0 ? matchingSkills.length / jobSkillsArray.length : 0;
   }

   /**
    * Calculate experience match score
    */
   calculateExperienceMatchScore(
      cvExperience: number,
      minRequired: number,
      maxRequired: number
   ): number {
      if (cvExperience >= minRequired && cvExperience <= maxRequired) {
         return 1.0; // Perfect match
      } else if (cvExperience >= minRequired) {
         // Over-qualified but still good
         const overQualification = cvExperience - maxRequired;
         return Math.max(0.7, 1.0 - (overQualification * 0.1));
      } else {
         // Under-qualified
         const experienceGap = minRequired - cvExperience;
         return Math.max(0, 1.0 - (experienceGap * 0.2));
      }
   }

   /**
    * Calculate education match score
    */
   calculateEducationMatchScore(
      cvEducation: Array<{ degree?: string }>,
      requiredEducation: string
   ): number {
      if (!requiredEducation || cvEducation.length === 0) {
         return 0.5; // Neutral score when no education info
      }

      const requiredLower = requiredEducation.toLowerCase();

      // Simple matching logic - can be enhanced
      for (const education of cvEducation) {
         const degree = education.degree?.toLowerCase() || '';
         if (degree.includes('bachelor') && requiredLower.includes('bachelor')) {
            return 1.0;
         }
         if (degree.includes('master') && requiredLower.includes('master')) {
            return 1.0;
         }
         if (degree.includes('phd') && requiredLower.includes('phd')) {
            return 1.0;
         }
      }

      return 0.3; // Some education but not exact match
   }
}

