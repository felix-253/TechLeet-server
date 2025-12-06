import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { CompanyServiceClient } from '../../analytics/company-service.client';

@Injectable()
export class JobContentGenerationTool extends BaseTool {
  private readonly logger = new Logger(JobContentGenerationTool.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly defaultModel = 'gemini-2.0-flash';

  name = 'generate_job_content';
  description = 'Generate job posting content (description, requirements, benefits) using AI based on job title, type, and other provided information. Returns structured data to fill job creation form.';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      jobTitle: {
        type: 'string',
        description: 'Job title or position name (e.g., "React Developer", "Intern Frontend")'
      },
      jobType: {
        type: 'string',
        description: 'Type of job (intern, full-time, part-time, contract, internship)'
      },
      position: {
        type: 'string',
        description: 'Position or role (e.g., "React Developer", "Frontend Engineer")'
      },
      experienceLevel: {
        type: 'string',
        enum: ['entry', 'junior', 'mid', 'senior', 'lead'],
        description: 'Experience level required'
      },
      employmentType: {
        type: 'string',
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        description: 'Employment type'
      },
      salaryRange: {
        type: 'string',
        description: 'Salary range mentioned by user (e.g., "10-15 triệu", "500-800 USD")'
      },
      departmentName: {
        type: 'string',
        description: 'Department name if mentioned by user'
      },
      location: {
        type: 'string',
        description: 'Location or city if mentioned by user'
      },
      skills: {
        type: 'string',
        description: 'Required skills or technologies mentioned by user'
      },
      vacancies: {
        type: 'number',
        description: 'Number of positions to fill'
      },
      departmentId: {
        type: 'number',
        description: 'Department ID if user provides it or mentions a specific department'
      },
      positionId: {
        type: 'number',
        description: 'Position ID if user provides it or mentions a specific position'
      },
      headquarterId: {
        type: 'number',
        description: 'Headquarter/Branch ID if user provides it'
      },
      applicationDeadline: {
        type: 'string',
        description: 'Application deadline date (YYYY-MM-DD) if user provides it'
      },
      positionName: {
        type: 'string',
        description: 'Position name if mentioned by user (e.g. "Senior React Developer")'
      },
      headquarterName: {
        type: 'string',
        description: 'Headquarter/Branch name if mentioned by user (e.g. "TechLeet HCM", "Hà Nội")'
      }
    },
    required: []
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly companyServiceClient: CompanyServiceClient
  ) {
    super();
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('Gemini API key not configured. Job content generation will not work.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      const validation = this.validateParameters(params);
      if (!validation.valid) {
        return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
      }

      // Extract job information
      const jobTitle = params.jobTitle || params.position || '';
      const jobType = params.jobType || params.employmentType || '';
      const experienceLevel = params.experienceLevel || '';
      const skills = params.skills || '';

      if (!jobTitle && !jobType) {
        return this.createErrorResult(
          'Missing information',
          'Please provide at least job title or job type to generate content.'
        );
      }

      // Generate content using Gemini AI
      const generatedContent = await this.generateContentWithAI({
        jobTitle,
        jobType,
        position: params.position,
        experienceLevel,
        employmentType: params.employmentType,
        salaryRange: params.salaryRange,
        skills,
        vacancies: params.vacancies
      });

      // 1. Try to assume department from job title if not provided
      const missingFields: string[] = [];
      const questions: string[] = [];

      let inferredDepartmentName = '';
      if (!params.departmentId && !params.departmentName && jobTitle) {
         inferredDepartmentName = this.inferDepartmentFromTitle(jobTitle);
         if (inferredDepartmentName) {
            this.logger.log(`Inferred department '${inferredDepartmentName}' from title '${jobTitle}'`);
         }
      }

      // 2. Identify missing fields
      // (variables initialized above)

      // 2. Identify missing fields
      // User requested to skip department/position/location questions and let them fill manually
      // So we do NOT add them to missingFields anymore.
      
      // We still infer department just for logging/internal context if needed, but won't block.
      if (inferredDepartmentName) {
         // Optionally we could add this to suggestions if we wanted, but for now we just log
      }

      // 3. Resolve Suggestions (Metadata Lookup)
      let suggestions: any = {};
      
      // A. Department Suggestion
      const targetDepartmentName = params.departmentName || inferredDepartmentName;
      let matchedDepartmentId: number | undefined;

      if (targetDepartmentName) {
        try {
          const departments = await this.companyServiceClient.getDepartments();
          // Find approximate match
          const matchedDept = departments.find(
            d => d.name.toLowerCase().includes(targetDepartmentName.toLowerCase()) || 
                 targetDepartmentName.toLowerCase().includes(d.name.toLowerCase())
          );
          
          if (matchedDept) {
            suggestions.departmentId = matchedDept.departmentId;
            matchedDepartmentId = matchedDept.departmentId;
            this.logger.log(`Matched department '${targetDepartmentName}' to ID ${matchedDept.departmentId}`);
          } else {
             // If inferred but no match in DB, we still might want to ask? 
             // Or just let the frontend handle the name? 
             // For now, if we inferred it but cant match ID, we might as well ask the user to be sure
             if (inferredDepartmentName) {
                // If it was inferred but invalid, treat as missing? 
                // Or pass the name to the frontend? 
                // Let's pass the inferred name in suggestions as a fallback if possible? 
                // The interface expects IDs. 
                // So if no ID match, we effectively failed the suggestion.
                // We should add it to missingFields?
                if (!params.departmentId && !params.departmentName) {
                   missingFields.push('departmentId');
                   questions.push(`Bạn có muốn chọn phòng ban là '${inferredDepartmentName}' không? (Không tìm thấy ID tương ứng)`);
                }
             }
          }
        } catch (error) {
          this.logger.warn('Failed to fetch departments for suggestions:', error);
        }
      }

      // B. Position Suggestion (Dependent on Department)
      // Only if we found a department (either provided or inferred+matched)
      if (matchedDepartmentId) {
         try {
            const positions = await this.companyServiceClient.getPositionsByDepartment(matchedDepartmentId);
            const positionText = params.positionName || params.position || jobTitle; // Use jobTitle as fallback for position search
            
            if (positions.length > 0 && positionText) {
               // Try to find best match
               const matchedPos = positions.find(
                  p => p.name.toLowerCase().includes(positionText.toLowerCase()) ||
                       positionText.toLowerCase().includes(p.name.toLowerCase())
               );
               
               if (matchedPos) {
                  suggestions.positionId = matchedPos.positionId;
                  // If we found a position match, we can remove positionId from missingFields!
                  const posIndex = missingFields.indexOf('positionId');
                  if (posIndex > -1) {
                     missingFields.splice(posIndex, 1);
                     // Also remove the question
                     // Note: Removing from questions array by index assumes parallel arrays. 
                     // Since we push strictly in order, we need to be careful.
                     // Better to filter questions.
                     // But questions logic was simple strings.
                     // Let's just clear the question if we found it.
                     const qIndex = questions.findIndex(q => q.includes('vị trí'));
                     if (qIndex > -1) questions.splice(qIndex, 1);
                  }
               }
            }
         } catch (error) {
             this.logger.warn('Failed to fetch positions for suggestions:', error);
         }
      }

      // C. Headquarter Suggestion
      if (params.headquarterName) {
         try {
            const branches = await this.companyServiceClient.getBranches();
            const matchedBranch = branches.find(
               b => b.name.toLowerCase().includes(params.headquarterName.toLowerCase())
            );
            if (matchedBranch) {
               suggestions.headquarterId = matchedBranch.branchId;
            }
         } catch (error) {
            this.logger.warn('Failed to fetch branches for suggestions:', error);
         }
      }

      // Build user-friendly message without showing JSON
      let message = 'Đã tạo nội dung cho job posting thành công!\n\n';
      if (generatedContent.title) {
        message += `Tiêu đề: ${generatedContent.title}\n`;
      }
      message += 'Đã tạo mô tả công việc, yêu cầu và phúc lợi.\n\n';
      
      if (questions.length > 0) {
        message += 'Vui lòng cung cấp thêm thông tin:\n';
        questions.forEach((q, idx) => {
          message += `${idx + 1}. ${q}\n`;
        });
      }

      return this.createSuccessResult(
        {
          generatedFields: generatedContent,
          missingFields,
          questions,
          suggestions
        },
        message
      );
    } catch (error) {
      this.logger.error('Failed to generate job content:', error);
      return this.createErrorResult('Generation error', error.message || 'Failed to generate job content');
    }
  }

  private async generateContentWithAI(context: {
    jobTitle: string;
    jobType: string;
    position?: string;
    experienceLevel?: string;
    employmentType?: string;
    salaryRange?: string;
    skills?: string;
    vacancies?: number;
  }): Promise<any> {
    try {
      const prompt = this.buildGenerationPrompt(context);
      
      const model = this.genAI.getGenerativeModel({
        model: this.defaultModel,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const systemPrompt = `Bạn là một chuyên viên HR và nhà tuyển dụng chuyên nghiệp. Nhiệm vụ của bạn là tạo nội dung cho job posting bằng tiếng Việt, chuyên nghiệp và hấp dẫn. 
Hãy tạo nội dung phù hợp với thị trường tuyển dụng Việt Nam, bao gồm mô tả công việc chi tiết, yêu cầu rõ ràng, và phúc lợi hấp dẫn.

QUAN TRỌNG về phần Yêu cầu (requirements):
- Phải bao gồm các yêu cầu kỹ thuật/chuyên môn CỤ THỂ liên quan đến vị trí công việc
- Ví dụ cho Tech jobs: 
  * Intern React/ReactJS: HTML, CSS, JavaScript cơ bản, ReactJS, các công cụ quản lý state (Redux, Zustand, Context API), Git
  * NodeJS Developer: Node.js, Express.js, RESTful API, Database (MongoDB, PostgreSQL), Git
  * Designer: Adobe Photoshop, Adobe Illustrator, Figma, UI/UX design principles
- Ví dụ cho Non-Tech jobs:
    *   Senior Accountant: Microsoft Excel (pivot tables, formulas), phần mềm kế toán (QuickBooks, SAP), Chuẩn mực Kế toán Việt Nam (VAS), GAAP/IFRS, báo cáo tài chính, thuế (VAT, Corporate Tax)
   *   HR Manager: HRIS/ATS systems, Luật Lao động Việt Nam, talent acquisition, employer branding
   *   Marketing Manager: Google Analytics, Facebook Ads, SEO tools, content creation, social media management
- Không chỉ viết chung chung như "có kiến thức về lập trình" hoặc "có kinh nghiệm trong lĩnh vực", mà phải liệt kê CỤ THỂ các công nghệ, phần mềm, tools, chuẩn mực, quy trình chuyên môn cần thiết
- Sau đó mới thêm các yêu cầu về soft skills (làm việc nhóm, giao tiếp, học hỏi, etc.)
- Luôn sử dụng tên công ty là "TechLeet" trong nội dung.

Trả lời bằng JSON format với các field: title, description, requirements, benefits, employmentType, experienceLevel, salaryMin, salaryMax, vacancies.`;

      const fullPrompt = `${systemPrompt}\n\n${prompt}`;
      const response = await model.generateContent(fullPrompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      // If AI didn't generate requirements or generated generic ones, use fallback
      let requirements = parsed.requirements;
      
      // Convert requirements to string if needed
      if (requirements && typeof requirements !== 'string') {
        if (Array.isArray(requirements)) {
          requirements = requirements.join('\n');
        } else {
          requirements = String(requirements);
        }
      }
      
      // Check if this is a tech job or non-tech job
      const jobTitle = (context.jobTitle || context.position || '').toLowerCase();
      const isTechJob = this.isTechJob(jobTitle);
      
      // For non-tech jobs, trust AI more - only use fallback if completely empty or very generic
      // For tech jobs, use stricter validation
      if (!requirements) {
        requirements = this.generateDefaultRequirements(context);
      } else if (isTechJob && this.isGenericRequirements(requirements)) {
        // Only check generic for tech jobs
        requirements = this.generateDefaultRequirements(context);
      } else if (!isTechJob) {
        // For non-tech jobs, if AI generated something, use it (even if not perfect)
        // Only fallback if it's completely empty or extremely generic
        if (this.isExtremelyGeneric(requirements)) {
          requirements = this.generateDefaultRequirements(context);
        }
        // Otherwise, use AI-generated requirements
      }
      
      return {
        title: parsed.title || context.jobTitle || context.position || 'Vị trí tuyển dụng',
        description: parsed.description || this.generateDefaultDescription(context),
        requirements: requirements,
        benefits: parsed.benefits || this.generateDefaultBenefits(context),
        employmentType: parsed.employmentType || context.employmentType || this.inferEmploymentType(context.jobType),
        experienceLevel: parsed.experienceLevel || context.experienceLevel || this.inferExperienceLevel(context.jobType),
        salaryMin: parsed.salaryMin || this.parseSalaryMin(context.salaryRange),
        salaryMax: parsed.salaryMax || this.parseSalaryMax(context.salaryRange),
        vacancies: parsed.vacancies || context.vacancies || 1
      };
    } catch (error) {
      this.logger.error('AI generation failed, using fallback:', error);
      // Fallback to default generation
      return {
        title: context.jobTitle || context.position || 'Vị trí tuyển dụng',
        description: this.generateDefaultDescription(context),
        requirements: this.generateDefaultRequirements(context),
        benefits: this.generateDefaultBenefits(context),
        employmentType: context.employmentType || this.inferEmploymentType(context.jobType),
        experienceLevel: context.experienceLevel || this.inferExperienceLevel(context.jobType),
        salaryMin: this.parseSalaryMin(context.salaryRange),
        salaryMax: this.parseSalaryMax(context.salaryRange),
        vacancies: context.vacancies || 1
      };
    }
  }

  private buildGenerationPrompt(context: {
    jobTitle: string;
    jobType: string;
    position?: string;
    experienceLevel?: string;
    employmentType?: string;
    salaryRange?: string;
    skills?: string;
    vacancies?: number;
  }): string {
    let prompt = `Tạo nội dung job posting cho:\n`;
    
    if (context.jobTitle) {
      prompt += `- Tiêu đề: ${context.jobTitle}\n`;
    }
    if (context.position) {
      prompt += `- Vị trí: ${context.position}\n`;
    }
    if (context.jobType) {
      prompt += `- Loại việc: ${context.jobType}\n`;
    }
    if (context.experienceLevel) {
      prompt += `- Mức độ kinh nghiệm: ${context.experienceLevel}\n`;
    }
    if (context.employmentType) {
      prompt += `- Loại việc làm: ${context.employmentType}\n`;
    }
    if (context.skills) {
      prompt += `- Kỹ năng yêu cầu: ${context.skills}\n`;
    }
    if (context.salaryRange) {
      prompt += `- Khoảng lương: ${context.salaryRange}\n`;
    }
    if (context.vacancies) {
      prompt += `- Số lượng tuyển: ${context.vacancies}\n`;
    }

    prompt += `\nHãy tạo nội dung chuyên nghiệp, hấp dẫn và phù hợp với thị trường Việt Nam.\n\n`;
    prompt += `Đặc biệt chú ý:\n`;
    prompt += `- Phần Yêu cầu (requirements) phải bao gồm các yêu cầu kỹ thuật/chuyên môn CỤ THỂ dựa trên vị trí công việc\n`;
    prompt += `- Ví dụ Tech: Nếu là React/ReactJS thì phải liệt kê: HTML, CSS, JavaScript, ReactJS, state management tools (Redux, Zustand, Context API), Git, etc.\n`;
    prompt += `- Ví dụ Tech: Nếu là NodeJS thì phải liệt kê: Node.js, Express.js, RESTful API, Database (MongoDB, PostgreSQL), etc.\n`;
    prompt += `- Ví dụ Non-Tech: Nếu là Accountant thì phải liệt kê: Microsoft Excel (pivot tables, formulas), phần mềm kế toán (QuickBooks, SAP), VAS, GAAP/IFRS, báo cáo tài chính, thuế, etc.\n`;
    prompt += `- Ví dụ Non-Tech: Nếu là HR thì phải liệt kê: HRIS/ATS systems, Luật Lao động Việt Nam, talent acquisition, etc.\n`;
    prompt += `- Ví dụ Non-Tech: Nếu là Marketing thì phải liệt kê: Google Analytics, Facebook Ads, SEO tools, content creation tools, etc.\n`;
    prompt += `- Sau đó mới thêm các yêu cầu về soft skills và thái độ làm việc\n`;
    
    return prompt;
  }

  private generateDefaultDescription(context: any): string {
    const jobTitle = context.jobTitle || context.position || 'vị trí này';
    const jobType = context.jobType || '';
    
    let description = `Tại TechLeet, chúng tôi đang tìm kiếm ${jobTitle} để tham gia vào đội ngũ của chúng tôi.\n\n`;
    
    if (jobType.includes('intern') || jobType.includes('thực tập')) {
      description += `Đây là cơ hội tuyệt vời cho các bạn sinh viên hoặc người mới bắt đầu muốn phát triển kỹ năng trong môi trường chuyên nghiệp.\n\n`;
      description += `Bạn sẽ được:\n`;
      description += `- Học hỏi và phát triển kỹ năng thực tế\n`;
      description += `- Làm việc với các công nghệ hiện đại\n`;
      description += `- Nhận được sự hướng dẫn từ các chuyên gia giàu kinh nghiệm\n`;
      description += `- Có cơ hội được tuyển dụng chính thức sau khi hoàn thành thực tập\n`;
    } else {
      description += `Vị trí này đòi hỏi người có đam mê với công nghệ, tinh thần học hỏi và khả năng làm việc nhóm.\n\n`;
      description += `Trách nhiệm chính:\n`;
      description += `- Phát triển và bảo trì các ứng dụng web\n`;
      description += `- Tham gia vào quá trình thiết kế và phát triển sản phẩm\n`;
      description += `- Cộng tác với các thành viên trong team để đảm bảo chất lượng sản phẩm\n`;
    }
    
    return description;
  }

  private generateDefaultRequirements(context: any): string {
    const skills = context.skills || '';
    const experienceLevel = context.experienceLevel || '';
    const jobTitle = (context.jobTitle || context.position || '').toLowerCase();
    
    let requirements = `Yêu cầu:\n\n`;
    
    // Technical requirements based on job title/position (fallback only)
    const technicalReqs = this.inferTechnicalRequirements(jobTitle, experienceLevel);
    if (technicalReqs.length > 0) {
      requirements += `Yêu cầu kỹ thuật:\n`;
      technicalReqs.forEach(req => {
        requirements += `- ${req}\n`;
      });
      requirements += `\n`;
    }
    
    if (skills) {
      requirements += `Kỹ năng bổ sung:\n`;
      requirements += `- ${skills}\n\n`;
    }
    
    if (experienceLevel) {
      requirements += `- Kinh nghiệm: ${this.mapExperienceLevel(experienceLevel)}\n`;
    }
    
    requirements += `Yêu cầu khác:\n`;
    requirements += `- Tinh thần học hỏi và cầu tiến\n`;
    requirements += `- Khả năng làm việc nhóm và giao tiếp tốt\n`;
    requirements += `- Chịu được áp lực công việc\n`;
    requirements += `- Kỹ năng giải quyết vấn đề tốt\n`;
    
    return requirements;
  }

  private isTechJob(jobTitle: string): boolean {
    const techKeywords = [
      'react', 'vue', 'angular', 'node', 'javascript', 'typescript',
      'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
      'python', 'java', 'php', 'ruby', 'go', 'rust', 'c++', 'c#',
      'developer', 'engineer', 'programmer', 'coder', 'dev',
      'mobile', 'ios', 'android', 'flutter', 'react native',
      'devops', 'sre', 'cloud', 'aws', 'azure', 'gcp',
      'qa', 'tester', 'test', 'automation',
      'designer', 'ui', 'ux', 'graphic design'
    ];
    return techKeywords.some(keyword => jobTitle.includes(keyword));
  }

  private isExtremelyGeneric(requirements: any): boolean {
    if (!requirements) return true;
    
    // Convert to string if it's not already
    let reqString: string;
    if (typeof requirements === 'string') {
      reqString = requirements;
    } else if (Array.isArray(requirements)) {
      reqString = requirements.join(' ');
    } else if (typeof requirements === 'object') {
      reqString = JSON.stringify(requirements);
    } else {
      reqString = String(requirements);
    }
    
    const lowerReq = reqString.toLowerCase();
    
    // Extremely generic = only soft skills, no domain knowledge at all
    const onlySoftSkills = /^(.*(tinh thần học hỏi| làm việc nhóm| giao tiếp| chịu áp lực| giải quyết vấn đề).*)$/i.test(lowerReq) &&
      !/(excel|quickbooks|sap|oracle|erp|accounting|kế toán|financial|tài chính|vas|gaap|ifrs|tax|thuế|hr|nhân sự|recruitment|tuyển dụng|marketing|sales|bán hàng|analytics|seo|social media|html|css|javascript|react|vue|angular|node|python|java|database|git|docker|kubernetes|aws|azure|gcp|figma|photoshop|illustrator)/i.test(lowerReq);
    
    return onlySoftSkills;
  }

  private isGenericRequirements(requirements: any): boolean {
    if (!requirements) return true;
    
    // Convert to string if it's not already
    let reqString: string;
    if (typeof requirements === 'string') {
      reqString = requirements;
    } else if (Array.isArray(requirements)) {
      reqString = requirements.join(' ');
    } else if (typeof requirements === 'object') {
      reqString = JSON.stringify(requirements);
    } else {
      reqString = String(requirements);
    }
    
    const lowerReq = reqString.toLowerCase();
    
    // Check if requirements are too generic (only soft skills, no specific tech)
    const genericPhrases = [
      'có kiến thức về lập trình',
      'kiến thức về phát triển phần mềm',
      'kỹ năng giải quyết vấn đề',
      'tinh thần học hỏi',
      'làm việc nhóm',
      'giao tiếp tốt',
      'chịu được áp lực'
    ];
    
    // If requirements only contain generic phrases without specific tech/frameworks
    const hasGenericOnly = genericPhrases.some(phrase => lowerReq.includes(phrase));
    
    // Expanded tech/domain-specific terms detection
    const hasSpecificTech = /(html|css|javascript|react|vue|angular|node|express|python|java|django|flask|spring|mongodb|postgresql|mysql|git|typescript|redux|zustand|docker|kubernetes|aws|azure|gcp|figma|photoshop|illustrator|excel|quickbooks|sap|oracle|erp|accounting software|financial software|tax software|gaap|ifrs|vietnamese accounting standards|audit|financial reporting|bookkeeping|financial analysis|budgeting|forecasting|financial modeling|power bi|tableau|sql|database|ms office|word|powerpoint|outlook|accounting principles|financial statements|balance sheet|income statement|cash flow|taxation|vat|corporate tax|personal tax|payroll|accounts payable|accounts receivable|general ledger|trial balance|reconciliation|bank reconciliation|inventory management|cost accounting|managerial accounting|financial planning|internal controls|compliance|regulatory|auditing standards|ifac|vietnam accounting standards board)/i.test(lowerReq);
    
    // If it has generic phrases but no specific tech/domain knowledge, it's too generic
    return hasGenericOnly && !hasSpecificTech;
  }

  private inferTechnicalRequirements(jobTitle: string, experienceLevel?: string): string[] {
    const requirements: string[] = [];
    const isIntern = experienceLevel === 'entry' || jobTitle.includes('intern') || jobTitle.includes('thực tập');
    
    // React/Frontend related
    if (jobTitle.includes('react') || jobTitle.includes('frontend') || jobTitle.includes('front-end')) {
      if (isIntern) {
        requirements.push('HTML, CSS, JavaScript cơ bản');
        requirements.push('ReactJS hoặc có kiến thức về React');
        requirements.push('Hiểu biết về các công cụ quản lý state (Redux, Zustand, Context API)');
      } else {
        requirements.push('Thành thạo HTML, CSS, JavaScript');
        requirements.push('Thành thạo ReactJS và các hooks');
        requirements.push('Kinh nghiệm với các công cụ quản lý state (Redux, Zustand, Context API)');
      }
      requirements.push('Git và version control');
      if (!isIntern) {
        requirements.push('TypeScript');
        requirements.push('Responsive design và mobile-first approach');
      }
    }
    
    // Node.js/Backend related
    if (jobTitle.includes('node') || jobTitle.includes('backend') || jobTitle.includes('back-end') || jobTitle.includes('express')) {
      if (isIntern) {
        requirements.push('Node.js cơ bản');
        requirements.push('Express.js hoặc framework tương tự');
        requirements.push('RESTful API');
      } else {
        requirements.push('Thành thạo Node.js');
        requirements.push('Thành thạo Express.js hoặc framework tương tự');
        requirements.push('Kinh nghiệm xây dựng RESTful API và GraphQL');
      }
      requirements.push('Database: MongoDB, PostgreSQL hoặc MySQL');
      requirements.push('Git và version control');
      if (!isIntern) {
        requirements.push('Microservices architecture');
        requirements.push('Authentication và Authorization (JWT, OAuth)');
      }
    }
    
    // Full-stack
    if (jobTitle.includes('fullstack') || jobTitle.includes('full-stack') || jobTitle.includes('full stack')) {
      if (isIntern) {
        requirements.push('HTML, CSS, JavaScript cơ bản');
        requirements.push('ReactJS hoặc framework frontend tương tự');
        requirements.push('Node.js và Express.js cơ bản');
      } else {
        requirements.push('Thành thạo ReactJS hoặc Vue.js/Angular');
        requirements.push('Thành thạo Node.js và Express.js');
      }
      requirements.push('Database: MongoDB, PostgreSQL');
      requirements.push('RESTful API');
      requirements.push('Git và version control');
    }
    
    // Designer
    if (jobTitle.includes('design') || jobTitle.includes('ui') || jobTitle.includes('ux')) {
      requirements.push('Adobe Photoshop');
      requirements.push('Adobe Illustrator');
      requirements.push('Figma hoặc Adobe XD');
      requirements.push('Hiểu biết về UI/UX design principles');
      if (!isIntern) {
        requirements.push('Prototyping và user research');
        requirements.push('Design systems');
      }
    }
    
    // Python
    if (jobTitle.includes('python')) {
      if (isIntern) {
        requirements.push('Python cơ bản');
        requirements.push('Django hoặc Flask');
      } else {
        requirements.push('Thành thạo Python');
        requirements.push('Thành thạo Django hoặc Flask');
      }
      requirements.push('Database: PostgreSQL, MySQL');
      requirements.push('RESTful API');
    }
    
    // Java
    if (jobTitle.includes('java') && !jobTitle.includes('javascript')) {
      if (isIntern) {
        requirements.push('Java cơ bản');
        requirements.push('Spring Framework');
      } else {
        requirements.push('Thành thạo Java');
        requirements.push('Thành thạo Spring Boot');
      }
      requirements.push('Database: MySQL, PostgreSQL');
      requirements.push('RESTful API');
    }
    
    // Vue.js
    if (jobTitle.includes('vue')) {
      if (isIntern) {
        requirements.push('HTML, CSS, JavaScript cơ bản');
        requirements.push('Vue.js cơ bản');
      } else {
        requirements.push('Thành thạo Vue.js');
        requirements.push('Vuex hoặc Pinia');
      }
      requirements.push('Git và version control');
    }
    
    // Angular
    if (jobTitle.includes('angular')) {
      if (isIntern) {
        requirements.push('HTML, CSS, JavaScript/TypeScript cơ bản');
        requirements.push('Angular cơ bản');
      } else {
        requirements.push('Thành thạo Angular');
        requirements.push('TypeScript');
      }
      requirements.push('RxJS');
      requirements.push('Git và version control');
    }
    
    // Mobile (React Native, Flutter)
    if (jobTitle.includes('mobile') || jobTitle.includes('react native') || jobTitle.includes('flutter')) {
      if (jobTitle.includes('react native')) {
        requirements.push('React Native');
        requirements.push('JavaScript/TypeScript');
      } else if (jobTitle.includes('flutter')) {
        requirements.push('Flutter');
        requirements.push('Dart');
      } else {
        requirements.push('React Native hoặc Flutter');
      }
      requirements.push('Mobile app development');
      requirements.push('Git và version control');
    }
    
    // DevOps
    if (jobTitle.includes('devops') || jobTitle.includes('dev ops')) {
      requirements.push('Docker và containerization');
      requirements.push('CI/CD pipelines');
      requirements.push('Cloud platforms (AWS, Azure, GCP)');
      requirements.push('Kubernetes');
      requirements.push('Infrastructure as Code (Terraform, Ansible)');
    }
    
    // QA/Tester
    if (jobTitle.includes('qa') || jobTitle.includes('test') || jobTitle.includes('tester')) {
      requirements.push('Testing methodologies (Unit, Integration, E2E)');
      requirements.push('Testing tools (Jest, Cypress, Selenium)');
      requirements.push('Bug tracking và reporting');
    }
    
    // Accounting/Finance
    if (jobTitle.includes('accountant') || jobTitle.includes('kế toán') || jobTitle.includes('finance') || jobTitle.includes('tài chính')) {
      if (isIntern) {
        requirements.push('Kiến thức cơ bản về kế toán và tài chính');
        requirements.push('Microsoft Excel cơ bản');
        requirements.push('Hiểu biết về nguyên lý kế toán');
      } else {
        requirements.push('Thành thạo Microsoft Excel (pivot tables, formulas, VLOOKUP)');
        requirements.push('Kinh nghiệm với phần mềm kế toán (QuickBooks, SAP, Oracle, hoặc phần mềm kế toán Việt Nam)');
        requirements.push('Hiểu biết sâu về Chuẩn mực Kế toán Việt Nam (VAS)');
        requirements.push('Kinh nghiệm với GAAP và/hoặc IFRS');
      }
      requirements.push('Báo cáo tài chính (Balance Sheet, Income Statement, Cash Flow)');
      requirements.push('Kế toán tổng hợp và kế toán chi tiết');
      requirements.push('Thuế (VAT, Corporate Tax, Personal Tax)');
      if (!isIntern) {
        requirements.push('Phân tích tài chính và lập ngân sách');
        requirements.push('Kiểm toán nội bộ và tuân thủ quy định');
        requirements.push('Quản lý Accounts Payable và Accounts Receivable');
      }
    }
    
    // HR/Recruitment
    if (jobTitle.includes('hr') || jobTitle.includes('human resource') || jobTitle.includes('recruitment') || jobTitle.includes('tuyển dụng') || jobTitle.includes('nhân sự')) {
      requirements.push('Microsoft Office (Word, Excel, PowerPoint)');
      requirements.push('Kỹ năng giao tiếp và đàm phán');
      if (!isIntern) {
        requirements.push('Kinh nghiệm với HRIS/ATS systems');
        requirements.push('Hiểu biết về Luật Lao động Việt Nam');
        requirements.push('Talent acquisition và employer branding');
      }
    }
    
    // Marketing
    if (jobTitle.includes('marketing') || jobTitle.includes('marketer')) {
      requirements.push('Microsoft Office và Google Workspace');
      if (!isIntern) {
        requirements.push('Digital marketing tools (Google Analytics, Facebook Ads, SEO tools)');
        requirements.push('Content creation và social media management');
        requirements.push('Marketing automation platforms');
      }
    }
    
    // Sales
    if (jobTitle.includes('sales') || jobTitle.includes('bán hàng')) {
      requirements.push('Microsoft Office');
      requirements.push('Kỹ năng giao tiếp và thuyết phục');
      if (!isIntern) {
        requirements.push('CRM systems (Salesforce, HubSpot, hoặc tương tự)');
        requirements.push('Kỹ năng đàm phán và closing deals');
      }
    }
    
    return requirements;
  }

  private generateDefaultBenefits(context: any): string {
    let benefits = `Phúc lợi:\n\n`;
    benefits += `- Lương cạnh tranh theo năng lực\n`;
    benefits += `- Môi trường làm việc trẻ trung, năng động\n`;
    benefits += `- Cơ hội phát triển nghề nghiệp rõ ràng\n`;
    benefits += `- Được đào tạo và nâng cao kỹ năng\n`;
    benefits += `- Chế độ bảo hiểm đầy đủ\n`;
    benefits += `- Nghỉ phép và các ngày lễ theo quy định\n`;
    
    return benefits;
  }

  private inferEmploymentType(jobType: string): string {
    if (!jobType) return 'full-time';
    const lower = jobType.toLowerCase();
    if (lower.includes('intern') || lower.includes('thực tập')) return 'internship';
    if (lower.includes('part-time') || lower.includes('bán thời gian')) return 'part-time';
    if (lower.includes('contract') || lower.includes('hợp đồng')) return 'contract';
    return 'full-time';
  }

  private inferExperienceLevel(jobType: string): string {
    if (!jobType) return 'entry';
    const lower = jobType.toLowerCase();
    if (lower.includes('intern') || lower.includes('thực tập') || lower.includes('entry')) return 'entry';
    if (lower.includes('senior') || lower.includes('lead')) return 'senior';
    if (lower.includes('junior')) return 'junior';
    return 'entry';
  }

  private mapExperienceLevel(level: string): string {
    const map: Record<string, string> = {
      'entry': 'Mới tốt nghiệp hoặc chưa có kinh nghiệm',
      'junior': '1-3 năm kinh nghiệm',
      'mid': '3-5 năm kinh nghiệm',
      'senior': '5+ năm kinh nghiệm',
      'lead': '5+ năm kinh nghiệm và có khả năng lãnh đạo'
    };
    return map[level] || level;
  }

  private parseSalaryMin(salaryRange?: string): number | undefined {
    if (!salaryRange) return undefined;
    
    // Try to extract numbers from range like "10-15 triệu" or "500-800 USD"
    const match = salaryRange.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (match) {
      const min = parseInt(match[1]);
      // Convert to VND if in millions
      if (salaryRange.toLowerCase().includes('triệu') || salaryRange.toLowerCase().includes('million')) {
        return min * 1000000;
      }
      // Assume USD if mentioned
      if (salaryRange.toLowerCase().includes('usd') || salaryRange.toLowerCase().includes('$')) {
        return min * 25000; // Approximate conversion
      }
      return min;
    }
    
    // Single number
    const singleMatch = salaryRange.match(/(\d+)/);
    if (singleMatch) {
      const num = parseInt(singleMatch[1]);
      if (salaryRange.toLowerCase().includes('triệu') || salaryRange.toLowerCase().includes('million')) {
        return num * 1000000;
      }
      if (salaryRange.toLowerCase().includes('usd') || salaryRange.toLowerCase().includes('$')) {
        return num * 25000;
      }
      return num;
    }
    
    return undefined;
  }

  private parseSalaryMax(salaryRange?: string): number | undefined {
    if (!salaryRange) return undefined;
    
    const match = salaryRange.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (match) {
      const max = parseInt(match[2]);
      if (salaryRange.toLowerCase().includes('triệu') || salaryRange.toLowerCase().includes('million')) {
        return max * 1000000;
      }
      if (salaryRange.toLowerCase().includes('usd') || salaryRange.toLowerCase().includes('$')) {
        return max * 25000;
      }
      return max;
    }
    
    return undefined;
  }

  private inferDepartmentFromTitle(title: string): string {
     const t = title.toLowerCase();
     if (/(dev|engineer|program|tech|data|software|test|qa|product owner|scrum|mobile|web|fullstack|frontend|backend|system|cloud|security|it)/.test(t)) {
        return 'Engineering';
     }
     if (/(design|ui|ux|art|creative|graphic)/.test(t)) {
        return 'Design';
     }
     if (/(market|social|seo|content|brand|media)/.test(t)) {
        return 'Marketing';
     }
     if (/(sales|biz|business|customer|account|telesale)/.test(t)) {
        return 'Sales';
     }
     if (/(hr|human|recruit|talent|people|admin|office)/.test(t)) {
        return 'Human Resources';
     }
     if (/(finance|accountant|kế toán|audit|tax|treasury)/.test(t)) {
        return 'Finance';
     }
     return '';
  }
}
