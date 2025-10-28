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

      const examQuestions = questionSet.questionSetItems.map((item) => ({
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
}
