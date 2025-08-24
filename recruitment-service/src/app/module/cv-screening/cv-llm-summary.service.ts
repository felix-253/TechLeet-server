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
    * Build prompt for CV summary generation with enhanced detail
    */
   private buildSummaryPrompt(
      cvText: string,
      processedData: ProcessedCvData,
      jobDescription?: string
   ): string {
      const jobContext = jobDescription 
         ? `\n\nJob Context:\n${jobDescription}\n\nPlease evaluate the candidate's fit for this specific role.`
         : '';

      return `
Bạn là một chuyên viên HR và nhà tuyển dụng kỹ thuật chuyên nghiệp. Hãy phân tích CV này một cách kỹ lưỡng và cung cấp đánh giá chi tiết, toàn diện bằng tiếng Việt.

Nội dung CV:
${cvText}

Dữ liệu trích xuất:
- Kinh nghiệm: ${processedData.totalExperienceYears} năm
- Kỹ năng kỹ thuật: ${processedData.skills.technical.join(', ')}
- Kỹ năng mềm: ${processedData.skills.soft.join(', ')}
- Học vấn: ${processedData.education.map(e => `${e.degree} tại ${e.institution} (${e.graduationYear})`).join(', ')}
- Lịch sử công việc: ${processedData.workExperience.map(w => `${w.position} tại ${w.company} (${w.duration})`).join(', ')}
${jobContext}

Vui lòng cung cấp phân tích chi tiết theo định dạng JSON sau. Hãy viết toàn bộ bằng tiếng Việt và chi tiết, cụ thể:

{
  "summary": "Tóm tắt chuyên môn chi tiết 3-4 câu về điểm mạnh chính, mức độ kinh nghiệm, chuyên môn kỹ thuật và hồ sơ tổng thể. Hãy cụ thể về nền tảng và thành tích của họ.",
  "keyHighlights": [
    "Kỹ năng kỹ thuật hoặc thành tích cụ thể",
    "Kinh nghiệm lãnh đạo hoặc quản lý dự án", 
    "Trình độ kỹ thuật đáng chú ý",
    "Kinh nghiệm ngành hoặc kiến thức chuyên môn",
    "Điểm nổi bật về học vấn hoặc chứng chỉ"
  ],
  "concerns": [
    "Bất kỳ khoảng trống nào trong kinh nghiệm hoặc kỹ năng",
    "Các lĩnh vực cần cải thiện",
    "Yêu cầu còn thiếu cho vị trí này"
  ],
  "skillsAssessment": {
    "technicalSkills": ["kỹ năng1", "kỹ năng2", "kỹ năng3"],
    "experienceLevel": "junior|mid|senior|lead",
    "strengthAreas": ["lĩnh vực1", "lĩnh vực2"],
    "improvementAreas": ["lĩnh vực1", "lĩnh vực2"]
  },
  "fitScore": 85,
  "recommendation": "phù_hợp_cao|phù_hợp_tốt|phù_hợp_vừa|ít_phù_hợp"
}

Hướng dẫn phân tích:
1. **Tóm tắt**: Viết tóm tắt toàn diện 3-4 câu bằng tiếng Việt bao gồm:
   - Mức độ kinh nghiệm và số năm kinh nghiệm
   - Năng lực kỹ thuật chính và công nghệ họ làm việc
   - Cấp độ/vị trí của họ (junior, mid, senior, lead)
   - Bất kỳ thành tích hoặc chuyên môn đáng chú ý nào
   
2. **Điểm nổi bật chính**: Liệt kê 4-5 điểm mạnh cụ thể bằng tiếng Việt:
   - Kỹ năng kỹ thuật với các công nghệ cụ thể được đề cập
   - Kinh nghiệm lãnh đạo, cố vấn hoặc quản lý nhóm
   - Kinh nghiệm quản lý dự án hoặc giao hàng
   - Chuyên môn lĩnh vực hoặc kiến thức ngành
   - Thành tích hoặc kết quả đáng chú ý
   
3. **Mối quan ngại**: Trung thực về bất kỳ khoảng trống hoặc mối quan ngại nào:
   - Thiếu kỹ năng cần thiết cho vị trí
   - Khoảng trống kinh nghiệm hoặc thiếu công nghệ nhất định
   - Câu hỏi về sự phát triển nghề nghiệp
   - Bất kỳ cờ đỏ nào trong CV
   
4. **Đánh giá kỹ năng**: Cung cấp đánh giá kỹ thuật chi tiết:
   - Liệt kê các kỹ năng kỹ thuật mạnh nhất của họ
   - Đánh giá chính xác mức độ kinh nghiệm của họ
   - Xác định các lĩnh vực điểm mạnh chính
   - Đề xuất các lĩnh vực để phát triển
   
5. **Chấm điểm**: Hãy thực tế trong việc chấm điểm:
   - 90-100: Phù hợp xuất sắc, vượt qua yêu cầu
   - 80-89: Phù hợp mạnh, đáp ứng tốt hầu hết yêu cầu
   - 70-79: Phù hợp tốt, đáp ứng yêu cầu cơ bản
   - 60-69: Phù hợp vừa phải, có một số khoảng trống nhưng có tiềm năng
   - Dưới 60: Ít phù hợp, có khoảng trống đáng kể

Tập trung vào việc cung cấp những hiểu biết có thể hành động cho các quyết định tuyển dụng. Hãy cụ thể về công nghệ, số năm kinh nghiệm và kỹ năng cụ thể thay vì các tuyên bố chung chung. Tất cả nội dung phải bằng tiếng Việt.
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
