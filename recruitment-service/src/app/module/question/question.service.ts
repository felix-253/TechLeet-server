import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { ExamQuestionEntity } from '../../../entities/question/exam_question.entity';
import { ExaminationEntity } from '../../../entities/question/examination.entity';
import { QuestionEntity } from '../../../entities/question/question.entity';
import { QuestionSetEntity } from '../../../entities/question/question_set.entity';
import { QuestionSetItemEntity } from '../../../entities/question/question_set_item.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { CreateQuestionDto, FilterQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { CreateExaminationDto, SubmitExaminationDto, UpdateScoreDto } from './dto/examination.dto';
import {
   CreateQuestionSetDto,
   UpdateQuestionSetDto,
   FilterQuestionSetDto,
} from './dto/question-set.dto';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class QuestionService {
   private readonly logger = new Logger(QuestionService.name);
   private readonly genAI: GoogleGenerativeAI | null = null;

   constructor(
      @InjectRepository(QuestionEntity)
      private readonly questionRepository: Repository<QuestionEntity>,
      @InjectRepository(QuestionSetEntity)
      private readonly questionSetRepository: Repository<QuestionSetEntity>,
      @InjectRepository(ExaminationEntity)
      private readonly examinationRepository: Repository<ExaminationEntity>,
      @InjectRepository(QuestionSetItemEntity)
      private readonly questionSetItemRepository: Repository<QuestionSetItemEntity>,
      @InjectRepository(ExamQuestionEntity)
      private readonly examQuestionRepository: Repository<ExamQuestionEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      private readonly configService: ConfigService,
   ) {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (apiKey) {
         this.genAI = new GoogleGenerativeAI(apiKey);
      } else {
         this.logger.warn('Gemini API key not configured. AI grading will not work.');
      }
   }

   async findQuestions(filter: FilterQuestionDto) {
      const where: any = {};
      const page = filter.page || 0;
      const limit = filter.limit || 10;
      const skip = page * limit;

      if (filter.text) {
         where.content = Like(`%${filter.text}%`);
      }
      if (filter.difficulty) {
         where.difficulty = filter.difficulty;
      }
      if (filter.startDate && filter.endDate) {
         where.createdAt = Between(new Date(filter.startDate), new Date(filter.endDate));
      }

      const [questions, total] = await this.questionRepository.findAndCount({
         where,
         order: {
            [filter.sortBy || 'createdAt']: filter.sortOrder || 'DESC',
         },
         skip,
         take: limit,
      });

      return { data: questions, total };
   }

   async createQuestion(dto: CreateQuestionDto) {
      const question = this.questionRepository.create(dto);
      return this.questionRepository.save(question);
   }

   async updateQuestion(id: number, dto: UpdateQuestionDto) {
      const question = await this.questionRepository.findOne({ where: { questionId: id } });
      if (!question) throw new NotFoundException('Question not found');

      Object.assign(question, dto);
      return this.questionRepository.save(question);
   }

   async deleteQuestion(id: number) {
      const question = await this.questionRepository.findOne({ where: { questionId: id } });
      if (!question) throw new NotFoundException('Question not found');

      return this.questionRepository.remove(question);
   }

   async findQuestionSets(filter: FilterQuestionSetDto) {
      const where: any = {};
      const page = filter.page || 0;
      const limit = filter.limit || 10;
      const skip = page * limit;

      if (filter.text) {
         where.title = Like(`%${filter.text}%`);
      }

      const [questionSets, total] = await this.questionSetRepository.findAndCount({
         where,
         relations: ['questionSetItems', 'questionSetItems.question'],
         order: {
            [filter.sortBy || 'createdAt']: filter.sortOrder || 'DESC',
         },
         skip,
         take: limit,
      });

      return { data: questionSets, total };
   }

   async createQuestionSet(dto: CreateQuestionSetDto) {
      const questionSet = this.questionSetRepository.create(dto);
      return this.questionSetRepository.save(questionSet);
   }

   async updateQuestionSet(id: number, dto: UpdateQuestionSetDto) {
      const questionSet = await this.questionSetRepository.findOne({ where: { setId: id } });
      if (!questionSet) throw new NotFoundException('Question set not found');

      Object.assign(questionSet, dto);
      return this.questionSetRepository.save(questionSet);
   }

   async addQuestionToSet(setId: number, questionId: number) {
      const [questionSet, question] = await Promise.all([
         this.questionSetRepository.findOne({ where: { setId } }),
         this.questionRepository.findOne({ where: { questionId } }),
      ]);

      if (!questionSet || !question)
         throw new NotFoundException('Question set or question not found');

      const existing = await this.questionSetItemRepository.findOne({
         where: { setId, questionId },
      });
      if (existing) throw new BadRequestException('Question already in set');

      const item = this.questionSetItemRepository.create({ setId, questionId });
      return this.questionSetItemRepository.save(item);
   }

   async removeQuestionFromSet(itemId: number) {
      const item = await this.questionSetItemRepository.findOne({ where: { setItemId: itemId } });
      if (!item) throw new NotFoundException('Set item not found');

      return this.questionSetItemRepository.remove(item);
   }

   async deleteQuestionSet(id: number) {
      const questionSet = await this.questionSetRepository.findOne({ where: { setId: id } });
      if (!questionSet) throw new NotFoundException('Question set not found');

      // Delete all items first
      const items = await this.questionSetItemRepository.find({ where: { setId: id } });
      if (items.length > 0) {
         await this.questionSetItemRepository.remove(items);
      }

      // Then delete the question set
      return this.questionSetRepository.remove(questionSet);
   }

   async createExamination(dto: CreateExaminationDto) {
      const questionSet = await this.questionSetRepository.findOne({
         where: { setId: dto.sourceSetId },
         relations: ['questionSetItems', 'questionSetItems.question'],
      });
      if (!questionSet) throw new NotFoundException('Question set not found');

      if (questionSet.questionSetItems.length === 0) {
         throw new BadRequestException('Question set is empty');
      }

      const examination = this.examinationRepository.create({
         applicationId: dto.applicationId,
         sourceSetId: dto.sourceSetId,
         status: 'pending',
      });
      const savedExam = await this.examinationRepository.save(examination);

      // Use all questions or the requested quantity
      let selectedQuestions = questionSet.questionSetItems;
      const requestedQuantity = dto.quantityQuestion;

      if (requestedQuantity && requestedQuantity < questionSet.questionSetItems.length) {
         // Randomly select questions with balanced difficulty distribution
         selectedQuestions = this.selectBalancedQuestions(
            questionSet.questionSetItems,
            requestedQuantity,
         );
      }

      const examQuestions = selectedQuestions.map((item) => ({
         examinationId: savedExam.examinationId,
         questionId: item.questionId,
      }));

      await this.examQuestionRepository.save(
         examQuestions.map((item) => this.examQuestionRepository.create(item)),
      );

      return this.getExaminationDetail(savedExam.examinationId);
   }

   async submitExamination(id: number, dto: SubmitExaminationDto) {
      const examination = await this.examinationRepository.findOne({
         where: { examinationId: id },
      });
      if (!examination) throw new NotFoundException('Examination not found');

      const examQuestions = await this.examQuestionRepository.find({
         where: { examinationId: id },
         relations: ['question'],
      });

      let totalScore = 0;

      // Grade all answers using AI
      for (const [examQuestionId, data] of Object.entries(dto.answers)) {
         const examQuestion = examQuestions.find(
            (eq) => eq.examinationQuestionId === parseInt(examQuestionId),
         );
         if (!examQuestion) continue;

         const answerData = data as { answerText: string; score?: number; reason?: string };
         examQuestion.answerText = answerData.answerText;

         // Use AI to grade if score/reason not provided
         if (answerData.score === undefined || answerData.reason === undefined) {
            this.logger.log(
               `AI grading for question ${examQuestion.questionId} - answer not pre-graded`,
            );
            const aiResult = await this.gradeAnswerWithAI(
               examQuestion.question,
               answerData.answerText,
            );
            examQuestion.score = aiResult.score;
            examQuestion.reason = aiResult.reason;
         } else {
            // Use provided score and reason
            examQuestion.score = answerData.score;
            examQuestion.reason = answerData.reason;
         }

         totalScore += examQuestion.score || 0;
      }

      await this.examQuestionRepository.save(examQuestions);

      // Calculate average score
      const averageScore = examQuestions.length > 0 ? totalScore / examQuestions.length : 0;

      examination.status = 'completed';
      examination.submittedAt = new Date();
      examination.totalScore = averageScore;
      await this.examinationRepository.save(examination);

      // Get application and job posting to check min score
      const application = await this.applicationRepository.findOne({
         where: { applicationId: examination.applicationId },
      });

      if (application) {
         const jobPosting = await this.jobPostingRepository.findOne({
            where: { jobPostingId: application.jobPostingId },
         });

         if (jobPosting && jobPosting.minScore !== undefined && jobPosting.minScore !== null) {
            // Check if examination passed
            const examinationPassed = averageScore >= jobPosting.minScore;
            // Check if CV screening also passed (before updating status)
            const cvScreeningPassed = application.status === 'screening_passed' || application.screeningStatus === 'passed';

            if (examinationPassed) {
               // Update application status
               application.status = 'passed_exam';
               this.logger.log(
                  `Application ${application.applicationId} passed exam with score ${averageScore.toFixed(2)} >= ${jobPosting.minScore}`,
               );

               // Check if CV screening also passed, then create interview request
               if (cvScreeningPassed) {
                  try {
                     // Check if interview request already exists
                     const existingInterview = await this.interviewRepository.findOne({
                        where: {
                           candidate_id: application.candidateId,
                           job_id: application.jobPostingId,
                        },
                     });

                     if (!existingInterview) {
                        // Create interview request with status='pending'
                        const placeholderDate = new Date();
                        placeholderDate.setFullYear(placeholderDate.getFullYear() + 1);

                        const interviewRequest = this.interviewRepository.create({
                           candidate_id: application.candidateId,
                           job_id: application.jobPostingId,
                           interviewer_ids: [],
                           scheduled_at: placeholderDate,
                           duration_minutes: 60,
                           meeting_link: '',
                           location: '',
                           status: 'pending',
                        });

                        const savedInterview = await this.interviewRepository.save(interviewRequest);
                        this.logger.log(
                           `Created interview request (interview_id: ${savedInterview.interview_id}) for application ${application.applicationId} after examination passed`,
                        );
                     } else {
                        this.logger.log(
                           `Interview request already exists for application ${application.applicationId} (interview_id: ${existingInterview.interview_id})`,
                        );
                     }
                  } catch (error) {
                     this.logger.error(
                        `Failed to create interview request for application ${application.applicationId}: ${error.message}`,
                        error.stack,
                     );
                     // Don't throw error - interview request creation failure shouldn't break the exam submission
                  }
               } else {
                  this.logger.log(
                     `Application ${application.applicationId} passed exam but CV screening not passed yet. Waiting for CV screening to complete.`,
                  );
               }
            } else {
               application.status = 'failed_exam';
               this.logger.log(
                  `Application ${application.applicationId} failed exam with score ${averageScore.toFixed(2)} < ${jobPosting.minScore}`,
               );
            }
            await this.applicationRepository.save(application);
         } else {
            // If no minScore set, consider exam passed if score > 0
            // Check if CV screening also passed (before checking score)
            const cvScreeningPassed = application.status === 'screening_passed' || application.screeningStatus === 'passed';
            
            if (averageScore > 0) {
               this.logger.log(
                  `Application ${application.applicationId} exam completed with score ${averageScore.toFixed(2)} (no minScore threshold set)`,
               );

               // Check if CV screening also passed, then create interview request
               if (cvScreeningPassed) {
                  try {
                     const existingInterview = await this.interviewRepository.findOne({
                        where: {
                           candidate_id: application.candidateId,
                           job_id: application.jobPostingId,
                        },
                     });

                     if (!existingInterview) {
                        const placeholderDate = new Date();
                        placeholderDate.setFullYear(placeholderDate.getFullYear() + 1);

                        const interviewRequest = this.interviewRepository.create({
                           candidate_id: application.candidateId,
                           job_id: application.jobPostingId,
                           interviewer_ids: [],
                           scheduled_at: placeholderDate,
                           duration_minutes: 60,
                           meeting_link: '',
                           location: '',
                           status: 'pending',
                        });

                        const savedInterview = await this.interviewRepository.save(interviewRequest);
                        this.logger.log(
                           `Created interview request (interview_id: ${savedInterview.interview_id}) for application ${application.applicationId} after examination completed`,
                        );
                     }
                  } catch (error) {
                     this.logger.error(
                        `Failed to create interview request for application ${application.applicationId}: ${error.message}`,
                        error.stack,
                     );
                  }
               }
            }
         }
      }

      this.logger.log(
         `Examination ${id} submitted successfully. Average score: ${averageScore.toFixed(2)} / 10`,
      );

      return this.getExaminationDetail(id);
   }

   async getExaminationDetail(id: number) {
      return this.examinationRepository.findOne({
         where: { examinationId: id },
         relations: ['examQuestions', 'examQuestions.question'],
      });
   }

   async updateExamScore(id: number, dto: UpdateScoreDto) {
      const examQuestion = await this.examQuestionRepository.findOne({
         where: { examinationQuestionId: id },
      });
      if (!examQuestion) throw new NotFoundException('Exam question not found');

      examQuestion.score = dto.score;
      examQuestion.reason = dto.reason;
      await this.examQuestionRepository.save(examQuestion);

      const examination = await this.examinationRepository.findOne({
         where: { examinationId: examQuestion.examinationId },
      });

      if (!examination) throw new NotFoundException('Examination not found');

      const examQuestions = await this.examQuestionRepository.find({
         where: { examinationId: examQuestion.examinationId },
      });

      // Calculate average score (total / number of questions)
      const totalScore = examQuestions.reduce((sum, eq) => sum + (eq.score || 0), 0);
      const questionCount = examQuestions.length;
      const averageScore = questionCount > 0 ? totalScore / questionCount : 0;

      examination.totalScore = averageScore;
      await this.examinationRepository.save(examination);

      // Auto-revaluate if examination is completed
      if (examination.status === 'completed') {
         // Get application and job posting to check min score
         const application = await this.applicationRepository.findOne({
            where: { applicationId: examination.applicationId },
         });

         if (application) {
            const jobPosting = await this.jobPostingRepository.findOne({
               where: { jobPostingId: application.jobPostingId },
            });

            if (jobPosting && jobPosting.minScore !== undefined && jobPosting.minScore !== null) {
               // Update application status based on score
               if (averageScore >= jobPosting.minScore) {
                  application.status = 'passed_exam';
                  this.logger.log(
                     `Application ${application.applicationId} passed exam after score update with score ${averageScore.toFixed(2)} >= ${jobPosting.minScore}`,
                  );
               } else {
                  application.status = 'failed_exam';
                  this.logger.log(
                     `Application ${application.applicationId} failed exam after score update with score ${averageScore.toFixed(2)} < ${jobPosting.minScore}`,
                  );
               }
               await this.applicationRepository.save(application);
            }
         }
      }

      return examQuestion;
   }

   async revaluateExamination(examinationId: number) {
      const examination = await this.examinationRepository.findOne({
         where: { examinationId },
      });
      if (!examination) throw new NotFoundException('Examination not found');

      if (examination.status !== 'completed') {
         throw new BadRequestException('Examination is not completed yet');
      }

      const examQuestions = await this.examQuestionRepository.find({
         where: { examinationId },
      });

      // Calculate average score
      const totalScore = examQuestions.reduce((sum, eq) => sum + (eq.score || 0), 0);
      const questionCount = examQuestions.length;
      const averageScore = questionCount > 0 ? totalScore / questionCount : 0;

      examination.totalScore = averageScore;
      await this.examinationRepository.save(examination);

      // Get application and job posting to check min score
      const application = await this.applicationRepository.findOne({
         where: { applicationId: examination.applicationId },
      });
      console.log('function revaluateExamination');
      if (application) {
         console.log('application have');

         const jobPosting = await this.jobPostingRepository.findOne({
            where: { jobPostingId: application.jobPostingId },
         });

         if (jobPosting && jobPosting.minScore !== undefined && jobPosting.minScore !== null) {
            // Update application status based on score
            console.log('compare');

            if (averageScore >= jobPosting.minScore) {
               console.log('pass');

               application.status = 'passed_exam';
               this.logger.log(
                  `Application ${application.applicationId} passed exam after revaluation with score ${averageScore.toFixed(2)} >= ${jobPosting.minScore}`,
               );
            } else {
               console.log('failed ');

               application.status = 'failed_exam';
               this.logger.log(
                  `Application ${application.applicationId} failed exam after revaluation with score ${averageScore.toFixed(2)} < ${jobPosting.minScore}`,
               );
            }
            await this.applicationRepository.save(application);
         }
      }

      this.logger.log(
         `Examination ${examinationId} revaluated successfully. Average score: ${averageScore.toFixed(2)} / 10`,
      );

      return this.getExaminationDetail(examinationId);
   }

   async getExaminationsToDo(applicationId: number) {
      return this.examinationRepository.find({
         where: { applicationId },
         relations: ['examQuestions', 'examQuestions.question'],
      });
   }

   /**
    * Select balanced questions from a question set based on difficulty distribution
    * @param questionSetItems - All available questions in the set
    * @param quantity - Number of questions to select
    * @returns Selected questions with balanced difficulty distribution
    */
   private selectBalancedQuestions(
      questionSetItems: QuestionSetItemEntity[],
      quantity: number,
   ): QuestionSetItemEntity[] {
      // Group questions by difficulty
      const difficultyGroups = {
         easy: [] as QuestionSetItemEntity[],
         medium: [] as QuestionSetItemEntity[],
         hard: [] as QuestionSetItemEntity[],
      };

      questionSetItems.forEach((item) => {
         const difficulty = item.question?.difficulty;
         if (difficulty && difficulty in difficultyGroups) {
            difficultyGroups[difficulty as keyof typeof difficultyGroups].push(item);
         }
      });

      // Calculate distribution: 30% easy, 50% medium, 20% hard
      let easyCount = Math.ceil(quantity * 0.3);
      let mediumCount = Math.ceil(quantity * 0.5);
      let hardCount = Math.max(1, quantity - easyCount - mediumCount);

      // Shuffle arrays using Fisher-Yates algorithm
      const shuffle = <T>(array: T[]): T[] => {
         const shuffled = [...array];
         for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
         }
         return shuffled;
      };

      // Adjust counts based on availability
      const availableEasy = difficultyGroups.easy.length;
      const availableMedium = difficultyGroups.medium.length;
      const availableHard = difficultyGroups.hard.length;

      // Adjust if we don't have enough questions in any category
      if (easyCount > availableEasy) {
         const diff = easyCount - availableEasy;
         easyCount = availableEasy;
         mediumCount += Math.floor(diff * 0.6);
         hardCount += Math.floor(diff * 0.4);
      }
      if (mediumCount > availableMedium) {
         const diff = mediumCount - availableMedium;
         mediumCount = availableMedium;
         easyCount += Math.floor(diff * 0.4);
         hardCount += Math.ceil(diff * 0.6);
      }
      if (hardCount > availableHard) {
         const diff = hardCount - availableHard;
         hardCount = availableHard;
         easyCount += Math.floor(diff * 0.5);
         mediumCount += Math.ceil(diff * 0.5);
      }

      // Select random questions from each difficulty group
      const selectedQuestions: QuestionSetItemEntity[] = [];

      // Select from each difficulty group
      const shuffledEasy = shuffle(difficultyGroups.easy);
      const shuffledMedium = shuffle(difficultyGroups.medium);
      const shuffledHard = shuffle(difficultyGroups.hard);

      // Add questions from each group
      selectedQuestions.push(...shuffledEasy.slice(0, easyCount));
      selectedQuestions.push(...shuffledMedium.slice(0, mediumCount));
      selectedQuestions.push(...shuffledHard.slice(0, hardCount));

      // If we still don't have enough questions, fill the rest with any available questions
      if (selectedQuestions.length < quantity) {
         const remaining = questionSetItems.filter((item) => !selectedQuestions.includes(item));
         const shuffledRemaining = shuffle(remaining);
         selectedQuestions.push(...shuffledRemaining.slice(0, quantity - selectedQuestions.length));
      }

      // Shuffle the final result to randomize order
      return shuffle(selectedQuestions);
   }

   /**
    * Grade an answer using AI by comparing it with the sample answer
    * @param question - The question with sample answer
    * @param candidateAnswer - The candidate's answer
    * @returns Score (0-10) and feedback
    */
   private async gradeAnswerWithAI(
      question: QuestionEntity,
      candidateAnswer: string,
   ): Promise<{ score: number; reason: string }> {
      try {
         if (!this.genAI) {
            this.logger.warn('Gemini AI not initialized. Using default score.');
            return { score: 5, reason: 'AI grading unavailable - default score assigned' };
         }

         this.logger.log(`Grading answer for question ${question.questionId} using AI`);

         // Build prompt for AI grading
         const prompt = this.buildGradingPrompt(question, candidateAnswer);

         const model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
               temperature: 0.3,
               maxOutputTokens: 500,
            },
         });

         const systemPrompt =
            'Bạn là một giáo viên chấm bài chuyên nghiệp. Chấm điểm câu trả lời của học viên dựa trên câu trả lời mẫu. Thang điểm từ 0 đến 10. Nếu câu trả lời không liên quan gì đến câu hỏi thì chấm 0 điểm. Toàn bộ phản hồi phải bằng tiếng Việt.';

         const fullPrompt = `${systemPrompt}\n\n${prompt}`;

         const response = await model.generateContent(fullPrompt);
         const content = response.response.text();

         if (!content) {
            this.logger.warn('No response from AI. Using default score.');
            return { score: 0, reason: 'AI grading failed - default score assigned' };
         }

         // Parse AI response
         const result = this.parseGradingResponse(content, question.questionId);

         this.logger.log(
            `AI grading completed for question ${question.questionId}: Score ${result.score}`,
         );

         return result;
      } catch (error) {
         this.logger.error(
            `AI grading failed for question ${question.questionId}: ${error.message}`,
         );
         // Return default score if AI grading fails
         return { score: 0, reason: 'AI grading error - default score assigned' };
      }
   }

   /**
    * Build prompt for AI grading
    */
   private buildGradingPrompt(question: QuestionEntity, candidateAnswer: string): string {
      return `Câu hỏi:
${question.content}

Câu trả lời mẫu:
${question.sampleAnswer || 'Không có câu trả lời mẫu'}

Câu trả lời của học viên:
${candidateAnswer}

Yêu cầu: Chấm điểm câu trả lời của học viên từ 0-10 dựa trên câu trả lời mẫu.

Độ khó: ${question.difficulty || 'medium'}

Hãy đánh giá:
1. Độ chính xác của nội dung (40%)
2. Độ đầy đủ của thông tin (30%)
3. Cấu trúc và cách trình bày (20%)
4. Sáng tạo và mở rộng (10%)

QUAN TRỌNG: Bạn PHẢI luôn trả về một điểm số từ 0-10. Ngay cả khi câu trả lời không liên quan, tầm bậy, hoặc sai hoàn toàn, vẫn phải chấm điểm (có thể là 0 điểm).

Chỉ trả về JSON, không có văn bản nào khác:
{
  "score": <điểm từ 0-10>,
  "reason": "<lý do chấm điểm chi tiết>"
}`;
   }

   /**
    * Parse AI grading response
    */
   private parseGradingResponse(
      content: string,
      questionId: number,
   ): { score: number; reason: string } {
      try {
         // Try to extract JSON from the response
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
               score: Math.max(0, Math.min(10, parsed.score || 0)),
               reason: parsed.reason || 'Đã chấm điểm tự động',
            };
         }

         // If no JSON found, try to extract score from text
         const scoreMatch = content.match(/["']?score["']?\s*:\s*(\d+(?:\.\d+)?)/);
         const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

         // Extract reason (everything after score)
         const reasonMatch = content.match(/reason["']?\s*:\s*["']([^"']+)["']/);
         const reason = reasonMatch ? reasonMatch[1] : 'Đã chấm điểm tự động bằng AI';

         this.logger.warn(
            `Question ${questionId}: Failed to parse JSON from AI response. Raw content: ${content.substring(0, 200)}`,
         );

         return {
            score: Math.max(0, Math.min(10, score)),
            reason,
         };
      } catch (error) {
         this.logger.error(
            `Question ${questionId}: Failed to parse AI grading response: ${error.message}. Content: ${content.substring(0, 200)}`,
         );
         return { score: 0, reason: 'Lỗi phân tích phản hồi AI' };
      }
   }
}
