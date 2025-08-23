import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessedCvData } from './cv-nlp-processing.service';

export interface CvSummaryResult {
   summary: string;
   keyHighlights: string[];
   concerns: string[];
   skillsAssessment: {
      technicalSkills: string[];
      experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
      strengthAreas: string[];
      improvementAreas: string[];
   };
   fitScore: number; // 0-100
   recommendation: 'strong_fit' | 'good_fit' | 'moderate_fit' | 'poor_fit';
   processingTimeMs: number;
}

export interface JobMatchAnalysis {
   overallMatch: number; // 0-100
   skillsMatch: number;
   experienceMatch: number;
   educationMatch: number;
   detailedAnalysis: {
      matchingSkills: string[];
      missingSkills: string[];
      experienceGap: string;
      educationFit: string;
   };
   recommendation: string;
}

@Injectable()
export class CvLlmSummaryService {
   private readonly logger = new Logger(CvLlmSummaryService.name);
   private readonly genAI: GoogleGenerativeAI;
   private readonly defaultModel = 'gemini-1.5-flash';

   constructor(private readonly configService: ConfigService) {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
         this.logger.warn('Gemini API key not configured. LLM summary service will not work.');
      }

      this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
   }

   /**
    * Generate comprehensive CV summary using LLM
    */
   async generateCvSummary(
      cvText: string,
      processedData: ProcessedCvData,
      jobDescription?: string
   ): Promise<CvSummaryResult> {
      const startTime = Date.now();
      
      try {
         this.logger.log('Generating CV summary using LLM');

         const prompt = this.buildSummaryPrompt(cvText, processedData, jobDescription);
         
         const model = this.genAI.getGenerativeModel({ model: this.defaultModel });
         const systemPrompt = 'You are an expert HR professional and technical recruiter. Analyze CVs objectively and provide structured insights for hiring decisions.';
         const fullPrompt = `${systemPrompt}\n\n${prompt}`;

         const response = await model.generateContent(fullPrompt);

         const content = response.response.text();
         if (!content) {
            throw new Error('No response from LLM');
         }

         const parsedResult = this.parseLlmResponse(content);
         const processingTime = Date.now() - startTime;

         this.logger.log(`CV summary generated successfully in ${processingTime}ms`);

         return {
            ...parsedResult,
            processingTimeMs: processingTime,
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`CV summary generation failed after ${processingTime}ms: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Analyze job match between CV and job posting
    */
   async analyzeJobMatch(
      cvText: string,
      processedData: ProcessedCvData,
      jobDescription: string,
      jobRequirements: string
   ): Promise<JobMatchAnalysis> {
      try {
         this.logger.log('Analyzing job match using LLM');

         const prompt = this.buildJobMatchPrompt(cvText, processedData, jobDescription, jobRequirements);
         
         const model = this.genAI.getGenerativeModel({ model: this.defaultModel });
         const systemPrompt = 'You are an expert technical recruiter. Analyze how well a candidate matches a specific job posting. Provide detailed, objective analysis with specific scores and recommendations.';
         const fullPrompt = `${systemPrompt}\n\n${prompt}`;

         const response = await model.generateContent(fullPrompt);

         const content = response.response.text();
         if (!content) {
            throw new Error('No response from LLM for job match analysis');
         }

         return this.parseJobMatchResponse(content);

      } catch (error) {
         this.logger.error(`Job match analysis failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Build prompt for CV summary generation
    */
   private buildSummaryPrompt(
      cvText: string,
      processedData: ProcessedCvData,
      jobDescription?: string
   ): string {
      const jobContext = jobDescription 
         ? `\n\nJob Context:\n${jobDescription}\n\nPlease consider this job when evaluating the candidate's fit.`
         : '';

      return `
Analyze this CV and provide a structured assessment:

CV Text:
${cvText}

Extracted Data:
- Experience: ${processedData.totalExperienceYears} years
- Technical Skills: ${processedData.skills.technical.join(', ')}
- Education: ${processedData.education.map(e => `${e.degree} from ${e.institution}`).join(', ')}
${jobContext}

Please provide your analysis in the following JSON format:
{
  "summary": "2-3 sentence professional summary",
  "keyHighlights": ["highlight 1", "highlight 2", "highlight 3"],
  "concerns": ["concern 1", "concern 2"],
  "skillsAssessment": {
    "technicalSkills": ["skill1", "skill2"],
    "experienceLevel": "junior|mid|senior|lead",
    "strengthAreas": ["area1", "area2"],
    "improvementAreas": ["area1", "area2"]
  },
  "fitScore": 85,
  "recommendation": "strong_fit|good_fit|moderate_fit|poor_fit"
}

Focus on:
1. Technical competency and experience level
2. Career progression and growth
3. Relevant skills for the role
4. Any red flags or concerns
5. Overall potential and fit
`;
   }

   /**
    * Build prompt for job match analysis
    */
   private buildJobMatchPrompt(
      cvText: string,
      processedData: ProcessedCvData,
      jobDescription: string,
      jobRequirements: string
   ): string {
      return `
Analyze how well this candidate matches the specific job posting:

Candidate CV:
${cvText}

Candidate Summary:
- Experience: ${processedData.totalExperienceYears} years
- Technical Skills: ${processedData.skills.technical.join(', ')}
- Education: ${processedData.education.map(e => `${e.degree} from ${e.institution}`).join(', ')}

Job Description:
${jobDescription}

Job Requirements:
${jobRequirements}

Please provide your analysis in the following JSON format:
{
  "overallMatch": 85,
  "skillsMatch": 90,
  "experienceMatch": 80,
  "educationMatch": 85,
  "detailedAnalysis": {
    "matchingSkills": ["skill1", "skill2"],
    "missingSkills": ["skill1", "skill2"],
    "experienceGap": "description of experience gap or fit",
    "educationFit": "how education aligns with requirements"
  },
  "recommendation": "detailed recommendation with specific reasons"
}

Provide scores out of 100 and be specific about matches and gaps.
`;
   }

   /**
    * Parse LLM response for CV summary
    */
   private parseLlmResponse(content: string): Omit<CvSummaryResult, 'processingTimeMs'> {
      try {
         // Try to extract JSON from the response
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
               summary: parsed.summary || 'Summary not available',
               keyHighlights: parsed.keyHighlights || [],
               concerns: parsed.concerns || [],
               skillsAssessment: {
                  technicalSkills: parsed.skillsAssessment?.technicalSkills || [],
                  experienceLevel: parsed.skillsAssessment?.experienceLevel || 'mid',
                  strengthAreas: parsed.skillsAssessment?.strengthAreas || [],
                  improvementAreas: parsed.skillsAssessment?.improvementAreas || [],
               },
               fitScore: parsed.fitScore || 50,
               recommendation: parsed.recommendation || 'moderate_fit',
            };
         }
      } catch (error) {
         this.logger.warn(`Failed to parse LLM response as JSON: ${error.message}`);
      }

      // Fallback: parse as plain text
      return this.parseTextResponse(content);
   }

   /**
    * Parse job match response
    */
   private parseJobMatchResponse(content: string): JobMatchAnalysis {
      try {
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
               overallMatch: parsed.overallMatch || 50,
               skillsMatch: parsed.skillsMatch || 50,
               experienceMatch: parsed.experienceMatch || 50,
               educationMatch: parsed.educationMatch || 50,
               detailedAnalysis: {
                  matchingSkills: parsed.detailedAnalysis?.matchingSkills || [],
                  missingSkills: parsed.detailedAnalysis?.missingSkills || [],
                  experienceGap: parsed.detailedAnalysis?.experienceGap || 'Analysis not available',
                  educationFit: parsed.detailedAnalysis?.educationFit || 'Analysis not available',
               },
               recommendation: parsed.recommendation || 'Further evaluation needed',
            };
         }
      } catch (error) {
         this.logger.warn(`Failed to parse job match response as JSON: ${error.message}`);
      }

      // Fallback
      return {
         overallMatch: 50,
         skillsMatch: 50,
         experienceMatch: 50,
         educationMatch: 50,
         detailedAnalysis: {
            matchingSkills: [],
            missingSkills: [],
            experienceGap: 'Analysis failed',
            educationFit: 'Analysis failed',
         },
         recommendation: 'Manual review required due to analysis error',
      };
   }

   /**
    * Fallback text parsing when JSON parsing fails
    */
   private parseTextResponse(content: string): Omit<CvSummaryResult, 'processingTimeMs'> {
      // Extract key information from text response
      const lines = content.split('\n').filter(line => line.trim());
      
      return {
         summary: lines[0] || 'Summary not available',
         keyHighlights: this.extractListItems(content, 'highlights'),
         concerns: this.extractListItems(content, 'concerns'),
         skillsAssessment: {
            technicalSkills: [],
            experienceLevel: 'mid',
            strengthAreas: [],
            improvementAreas: [],
         },
         fitScore: 50,
         recommendation: 'moderate_fit',
      };
   }

   /**
    * Extract list items from text
    */
   private extractListItems(text: string, keyword: string): string[] {
      const regex = new RegExp(`${keyword}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
      const match = text.match(regex);
      
      if (match) {
         return match[1]
            .split('\n')
            .map(line => line.replace(/^[-*•]\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 5); // Limit to 5 items
      }
      
      return [];
   }
}
