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
    * Applies hard requirement checks - if experience score is too low, caps overall score
    */
   calculateOverallScore(
      vectorSimilarity: number,
      skillsScore: number,
      experienceScore: number,
      educationScore: number,
      chunkSimilarity: number
   ): ScoringResult {
      // Calculate base overall score
      let overallScore = (
         vectorSimilarity * 0.4 +
         skillsScore * 0.3 +
         experienceScore * 0.2 +
         educationScore * 0.1
      );

      // Hard requirement penalty: If experience score is very low (severe under-qualification),
      // cap the overall score to prevent false positives
      if (experienceScore < 0.3) {
         // Severe under-qualification: max overall score is 50% regardless of other factors
         overallScore = Math.min(overallScore, 0.5);
      } else if (experienceScore < 0.5) {
         // Moderate under-qualification: cap at 70%
         overallScore = Math.min(overallScore, 0.7);
      }

      // Convert to 0-100 scale
      overallScore = overallScore * 100;

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
    * @param cvSkills - Array of technical skills from CV
    * @param jobSkills - Comma-separated string of required skills
    */
   calculateSkillsMatchScore(cvSkills: string[], jobSkills: string): number {
      if (!jobSkills || !jobSkills.trim()) {
         return 0;
      }

      if (!cvSkills || cvSkills.length === 0) {
         return 0;
      }

      // Normalize job skills: split by comma, semicolon, or space
      const jobSkillsArray = jobSkills
         .toLowerCase()
         .split(/[,;]/)
         .map(s => s.trim())
         .filter(s => s.length > 0);

      if (jobSkillsArray.length === 0) {
         return 0;
      }

      // Normalize CV skills - remove common suffixes/prefixes
      const normalizeSkill = (skill: string): string => {
         return skill
            .toLowerCase()
            .trim()
            .replace(/\.js$|\.ts$|\.tsx$|\.jsx$/g, '') // Remove file extensions
            .replace(/^javascript$/i, 'js')
            .replace(/^typescript$/i, 'ts')
            .replace(/\s+/g, ' '); // Normalize spaces
      };

      const cvSkillsNormalized = cvSkills
         .map(normalizeSkill)
         .filter(s => s.length > 0);

      // Match each job skill against CV skills
      const matchingSkills = jobSkillsArray.filter(jobSkill => {
         const normalizedJobSkill = normalizeSkill(jobSkill);
         
         // Check exact match first
         if (cvSkillsNormalized.includes(normalizedJobSkill)) {
            return true;
         }
         
         // Check abbreviations (JS/TS = JavaScript/TypeScript)
         if (normalizedJobSkill === 'js' || normalizedJobSkill === 'javascript') {
            if (cvSkillsNormalized.some(s => s.includes('javascript') || s === 'js')) {
               return true;
            }
         }
         if (normalizedJobSkill === 'ts' || normalizedJobSkill === 'typescript') {
            if (cvSkillsNormalized.some(s => s.includes('typescript') || s === 'ts')) {
               return true;
            }
         }
         
         // Check if CV skill contains job skill or vice versa (with word boundaries)
         return cvSkillsNormalized.some(cvSkill => {
            // Exact match
            if (cvSkill === normalizedJobSkill) {
               return true;
            }
            // Contains match (whole word or part)
            if (cvSkill.includes(normalizedJobSkill) || normalizedJobSkill.includes(cvSkill)) {
               return true;
            }
            // Special handling for REST API
            if ((normalizedJobSkill === 'rest' || normalizedJobSkill === 'rest api') && 
                (cvSkill.includes('rest') || cvSkill.includes('api'))) {
               return true;
            }
            return false;
         });
      });

      const matchRatio = matchingSkills.length / jobSkillsArray.length;
      
      return matchRatio;
   }

   /**
    * Calculate experience match score
    * Returns 0 for severe under-qualification, penalizes gaps more aggressively
    */
   calculateExperienceMatchScore(
      cvExperience: number,
      minRequired: number,
      maxRequired: number
   ): number {
      // Hard requirement: If significantly under-qualified (gap > 3 years), return very low score
      if (cvExperience < minRequired) {
         const experienceGap = minRequired - cvExperience;
         
         // Severe under-qualification: gap > 3 years → reject (score = 0)
         if (experienceGap > 3) {
            return 0;
         }
         
         // Moderate under-qualification: gap 2-3 years → heavy penalty
         if (experienceGap > 2) {
            return Math.max(0, 0.3 - (experienceGap - 2) * 0.15);
         }
         
         // Small gap: 1-2 years → moderate penalty but still possible
         return Math.max(0.2, 0.7 - (experienceGap * 0.25));
      }
      
      // Perfect match: within required range
      if (cvExperience >= minRequired && cvExperience <= maxRequired) {
         return 1.0;
      }
      
      // Over-qualified: still good but minor penalty
      const overQualification = cvExperience - maxRequired;
      // Small over-qualification (1-2 years) → minimal penalty
      if (overQualification <= 2) {
         return Math.max(0.9, 1.0 - (overQualification * 0.05));
      }
      // Significant over-qualification → moderate penalty
      return Math.max(0.7, 0.9 - ((overQualification - 2) * 0.1));
   }

   /**
    * Calculate education match score
    * Checks degree, field, and institution name for better matching
    */
   calculateEducationMatchScore(
      cvEducation: Array<{ degree?: string; field?: string; institution?: string }>,
      requiredEducation: string
   ): number {
      if (!requiredEducation || !requiredEducation.trim()) {
         return 0.5; // Neutral score when no education requirement
      }

      if (!cvEducation || cvEducation.length === 0) {
         return 0.3; // Some penalty when no education info from CV
      }

      const requiredLower = requiredEducation.toLowerCase();

      // Check each education entry
      for (const education of cvEducation) {
         const degree = (education.degree || '').toLowerCase();
         const field = (education.field || '').toLowerCase();
         const institution = (education.institution || '').toLowerCase();
         
         // Extract degree level and field from requirement
         const requiresBachelor = requiredLower.includes('bachelor') || requiredLower.includes('bachelor\'s') || requiredLower.includes('cử nhân');
         const requiresMaster = requiredLower.includes('master') || requiredLower.includes('master\'s') || requiredLower.includes('thạc sĩ');
         const requiresPhd = requiredLower.includes('phd') || requiredLower.includes('doctorate') || requiredLower.includes('tiến sĩ');
         
         const requiresSoftware = requiredLower.includes('software');
         const requiresComputer = requiredLower.includes('computer');
         const requiresEngineering = requiredLower.includes('engineering');
         const requiresIt = requiredLower.includes('it') || requiredLower.includes('information technology');
         
         // Check if CV has relevant field (even without degree name)
         const hasSoftwareField = field.includes('software');
         const hasComputerField = field.includes('computer') || field.includes('computing');
         const hasEngineeringField = field.includes('engineering');
         const hasItField = field.includes('it') || field.includes('information technology') || field.includes('information tech');
         
         // Check degree level first
         let degreeLevelMatch = false;
         if (requiresBachelor) {
            degreeLevelMatch = degree.includes('bachelor') || degree.includes('cử nhân') || 
                              degree.includes('b.sc') || degree.includes('b.eng') || 
                              degree.includes('bachelor') || degree === 'bs' || degree === 'be';
         } else if (requiresMaster) {
            degreeLevelMatch = degree.includes('master') || degree.includes('thạc sĩ') || 
                              degree.includes('m.sc') || degree.includes('m.eng') || 
                              degree.includes('mba') || degree === 'ms' || degree === 'me';
         } else if (requiresPhd) {
            degreeLevelMatch = degree.includes('phd') || degree.includes('doctorate') || 
                              degree.includes('tiến sĩ') || degree.includes('d.sc');
         }
         
         // If degree level matches, check field
         if (degreeLevelMatch) {
            if (requiresSoftware || requiresComputer || requiresEngineering || requiresIt) {
               if (hasSoftwareField || hasComputerField || hasEngineeringField || hasItField) {
                  return 1.0; // Perfect match: degree + field
               }
               return 0.8; // Degree matches but field is different
            }
            return 0.9; // Degree matches, field not specified in requirement
         }
         
         // If no degree but has field that matches requirement - give partial credit
         // This handles cases where CV just lists "Software Engineering" or "University Name - Software Engineering"
         if (!degree || degree.length === 0) {
            if (requiresBachelor || !requiresMaster && !requiresPhd) {
               // Assume Bachelor level if not specified and field matches
               if ((requiresSoftware && hasSoftwareField) || 
                   (requiresComputer && hasComputerField) || 
                   (requiresEngineering && hasEngineeringField) ||
                   (requiresIt && hasItField)) {
                  // Check if institution suggests university education
                  if (institution.includes('university') || institution.includes('college') || 
                      institution.includes('trường') || institution.includes('đại học')) {
                     return 0.85; // High score: field matches + institution suggests degree level
                  }
                  return 0.7; // Medium score: field matches but no clear institution
               }
            }
         }
      }

      // Check if there's any education info that might be relevant
      const hasAnyEducation = cvEducation.some(edu => 
         edu.degree || edu.field || edu.institution
      );
      
      if (hasAnyEducation) {
         return 0.4; // Has education but doesn't match requirement exactly
      }

      return 0.3; // Some education info but unclear
   }
}


