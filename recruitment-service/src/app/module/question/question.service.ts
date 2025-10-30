import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { ExamQuestionEntity } from '../../../entities/question/exam_question.entity';
import { ExaminationEntity } from '../../../entities/question/examination.entity';
import { QuestionEntity } from '../../../entities/question/question.entity';
import { QuestionSetEntity } from '../../../entities/question/question_set.entity';
import { QuestionSetItemEntity } from '../../../entities/question/question_set_item.entity';
import { CreateQuestionDto, FilterQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { CreateExaminationDto, SubmitExaminationDto, UpdateScoreDto } from './dto/examination.dto';
import {
   CreateQuestionSetDto,
   UpdateQuestionSetDto,
   FilterQuestionSetDto,
} from './dto/question-set.dto';

@Injectable()
export class QuestionService {
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
   ) {}

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

      for (const [examQuestionId, data] of Object.entries(dto.answers)) {
         const examQuestion = examQuestions.find(
            (eq) => eq.examinationQuestionId === parseInt(examQuestionId),
         );
         if (!examQuestion) continue;

         const answerData = data as { answerText: string; score?: number; reason?: string };
         examQuestion.answerText = answerData.answerText;
         examQuestion.score = answerData.score;
         examQuestion.reason = answerData.reason;
         totalScore += answerData.score || 0;
      }

      await this.examQuestionRepository.save(examQuestions);

      examination.status = 'completed';
      examination.submittedAt = new Date();
      examination.totalScore = totalScore;
      await this.examinationRepository.save(examination);

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
      examination.totalScore = questionCount > 0 ? totalScore / questionCount : 0;
      await this.examinationRepository.save(examination);

      return examQuestion;
   }

   async getExaminationsToDo(applicationId: number) {
      return this.examinationRepository.find({
         where: { applicationId, status: 'pending' },
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
}
