import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { QuestionSetEntity } from '../../../../entities/question/question_set.entity';
import { QuestionSetItemEntity } from '../../../../entities/question/question_set_item.entity';
import { QuestionEntity } from '../../../../entities/question/question.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';

@Injectable()
export class QuestionSetTool extends BaseTool {
  name = 'question_set_tool';
  description = 'Manage question sets: create, update, delete question sets, add/remove questions to/from sets, get question set details, and list question sets.';
  
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'delete', 'get', 'list', 'add_question', 'remove_question', 'get_questions', 'get_stats'],
        description: 'Action to perform: create (create new question set), update (update question set), delete (delete question set), get (get question set details), list (list question sets), add_question (add question to set), remove_question (remove question from set), get_questions (get questions in set), get_stats (get question set statistics)'
      },
      setId: {
        type: 'number',
        description: 'Question set ID (required for update, delete, get, add_question, remove_question, get_questions, get_stats)'
      },
      title: {
        type: 'string',
        description: 'Question set title (required for create, optional for update)'
      },
      description: {
        type: 'string',
        description: 'Question set description (optional for create and update)'
      },
      questionId: {
        type: 'number',
        description: 'Question ID (required for add_question, remove_question)'
      },
      setItemId: {
        type: 'number',
        description: 'Question set item ID (required for remove_question by item ID)'
      },
      search: {
        type: 'string',
        description: 'Search keyword for title or description (optional for list)'
      },
      page: {
        type: 'number',
        description: 'Page number (0-based, optional for list, default: 0)'
      },
      limit: {
        type: 'number',
        description: 'Number of items per page (optional for list, default: 10, max: 100)'
      },
      sortBy: {
        type: 'string',
        enum: ['setId', 'title', 'createdAt'],
        description: 'Sort field (optional for list, default: createdAt)'
      },
      sortOrder: {
        type: 'string',
        enum: ['ASC', 'DESC'],
        description: 'Sort order (optional for list, default: DESC)'
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(QuestionSetEntity)
    private readonly questionSetRepository: Repository<QuestionSetEntity>,
    @InjectRepository(QuestionSetItemEntity)
    private readonly questionSetItemRepository: Repository<QuestionSetItemEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>
  ) {
    super();
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
    }

    try {
      if (this.requiresConfirmation(params.action, params) && !params.confirmed) {
        return this.createConfirmationRequest(params.action, params);
      }

      switch (params.action) {
        case 'create':
          return await this.createQuestionSet(params, context);
        case 'update':
          return await this.updateQuestionSet(params, context);
        case 'delete':
          return await this.deleteQuestionSet(params, context);
        case 'get':
          return await this.getQuestionSet(params, context);
        case 'list':
          return await this.listQuestionSets(params, context);
        case 'add_question':
          return await this.addQuestionToSet(params, context);
        case 'remove_question':
          return await this.removeQuestionFromSet(params, context);
        case 'get_questions':
          return await this.getQuestionsInSet(params, context);
        case 'get_stats':
          return await this.getQuestionSetStats(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async createQuestionSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.title) {
      return this.createErrorResult('Missing required field', 'title is required for create action');
    }

    try {
      const questionSet = this.questionSetRepository.create({
        title: params.title,
        description: params.description
      });

      const saved = await this.questionSetRepository.save(questionSet);

      return this.createSuccessResult(
        {
          setId: saved.setId,
          title: saved.title,
          description: saved.description,
          createdAt: saved.createdAt
        },
        `Question set "${saved.title}" created successfully`
      );
    } catch (error) {
      if (error.code === '23505') {
        return this.createErrorResult('Duplicate title', `Question set with title "${params.title}" already exists`);
      }
      return this.createErrorResult('Create failed', error.message);
    }
  }

  private async updateQuestionSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setId) {
      return this.createErrorResult('Missing required field', 'setId is required for update action');
    }

    try {
      const questionSet = await this.questionSetRepository.findOne({
        where: { setId: params.setId }
      });

      if (!questionSet) {
        return this.createErrorResult('Question set not found', `Question set with ID ${params.setId} not found`);
      }

      if (params.title) {
        questionSet.title = params.title;
      }
      if (params.description !== undefined) {
        questionSet.description = params.description;
      }

      const updated = await this.questionSetRepository.save(questionSet);

      return this.createSuccessResult(
        {
          setId: updated.setId,
          title: updated.title,
          description: updated.description,
          updatedAt: updated.updatedAt
        },
        `Question set "${updated.title}" updated successfully`
      );
    } catch (error) {
      if (error.code === '23505') {
        return this.createErrorResult('Duplicate title', `Question set with title "${params.title}" already exists`);
      }
      return this.createErrorResult('Update failed', error.message);
    }
  }

  private async deleteQuestionSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setId) {
      return this.createErrorResult('Missing required field', 'setId is required for delete action');
    }

    try {
      const questionSet = await this.questionSetRepository.findOne({
        where: { setId: params.setId },
        relations: ['questionSetItems', 'jobPostings']
      });

      if (!questionSet) {
        return this.createErrorResult('Question set not found', `Question set with ID ${params.setId} not found`);
      }

      const itemCount = questionSet.questionSetItems?.length || 0;
      const jobCount = questionSet.jobPostings?.length || 0;

      if (jobCount > 0) {
        return this.createErrorResult('Cannot delete', `Question set is used by ${jobCount} job posting(s). Please remove it from jobs first.`);
      }

      if (itemCount > 0) {
        await this.questionSetItemRepository.delete({ setId: params.setId });
      }

      await this.questionSetRepository.remove(questionSet);

      return this.createSuccessResult(
        { setId: params.setId, deletedItems: itemCount },
        `Question set "${questionSet.title}" deleted successfully (removed ${itemCount} question(s))`
      );
    } catch (error) {
      return this.createErrorResult('Delete failed', error.message);
    }
  }

  private async getQuestionSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setId) {
      return this.createErrorResult('Missing required field', 'setId is required for get action');
    }

    try {
      const questionSet = await this.questionSetRepository.findOne({
        where: { setId: params.setId },
        relations: ['questionSetItems', 'questionSetItems.question', 'jobPostings']
      });

      if (!questionSet) {
        return this.createErrorResult('Question set not found', `Question set with ID ${params.setId} not found`);
      }

      const questions = questionSet.questionSetItems?.map(item => ({
        questionId: item.question?.questionId,
        content: item.question?.content,
        sampleAnswer: item.question?.sampleAnswer,
        difficulty: item.question?.difficulty
      })) || [];

      return this.createSuccessResult(
        {
          setId: questionSet.setId,
          title: questionSet.title,
          description: questionSet.description,
          questionCount: questions.length,
          questions,
          jobCount: questionSet.jobPostings?.length || 0,
          createdAt: questionSet.createdAt,
          updatedAt: questionSet.updatedAt
        },
        `Question set "${questionSet.title}" retrieved successfully (${questions.length} question(s))`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async listQuestionSets(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      const page = params.page || 0;
      const limit = Math.min(params.limit || 10, 100);
      const skip = page * limit;
      const sortBy = params.sortBy || 'createdAt';
      const sortOrder = params.sortOrder || 'DESC';

      const queryBuilder = this.questionSetRepository
        .createQueryBuilder('questionSet')
        .leftJoinAndSelect('questionSet.questionSetItems', 'items')
        .orderBy(`questionSet.${sortBy}`, sortOrder)
        .skip(skip)
        .take(limit);

      if (params.search) {
        queryBuilder.where(
          '(questionSet.title LIKE :search OR questionSet.description LIKE :search)',
          { search: `%${params.search}%` }
        );
      }

      const [questionSets, total] = await queryBuilder.getManyAndCount();

      return this.createSuccessResult(
        {
          questionSets: questionSets.map(qs => ({
            setId: qs.setId,
            title: qs.title,
            description: qs.description,
            questionCount: qs.questionSetItems?.length || 0,
            createdAt: qs.createdAt
          })),
          total,
          page,
          limit
        },
        `Found ${questionSets.length} question set(s) (total: ${total})`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async addQuestionToSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setId || !params.questionId) {
      return this.createErrorResult('Missing required fields', 'setId and questionId are required for add_question action');
    }

    try {
      const [questionSet, question] = await Promise.all([
        this.questionSetRepository.findOne({ where: { setId: params.setId } }),
        this.questionRepository.findOne({ where: { questionId: params.questionId } })
      ]);

      if (!questionSet) {
        return this.createErrorResult('Question set not found', `Question set with ID ${params.setId} not found`);
      }

      if (!question) {
        return this.createErrorResult('Question not found', `Question with ID ${params.questionId} not found`);
      }

      const existing = await this.questionSetItemRepository.findOne({
        where: { setId: params.setId, questionId: params.questionId }
      });

      if (existing) {
        return this.createErrorResult('Question already in set', `Question ${params.questionId} is already in question set ${params.setId}`);
      }

      const item = this.questionSetItemRepository.create({
        setId: params.setId,
        questionId: params.questionId
      });

      const saved = await this.questionSetItemRepository.save(item);

      return this.createSuccessResult(
        {
          setItemId: saved.setItemId,
          setId: saved.setId,
          questionId: saved.questionId,
          content: question.content
        },
        `Question "${question.content?.substring(0, 50)}..." added to question set "${questionSet.title}" successfully`
      );
    } catch (error) {
      return this.createErrorResult('Add failed', error.message);
    }
  }

  private async removeQuestionFromSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setItemId && (!params.setId || !params.questionId)) {
      return this.createErrorResult('Missing required fields', 'Either setItemId or (setId and questionId) are required for remove_question action');
    }

    try {
      let item: QuestionSetItemEntity | null = null;

      if (params.setItemId) {
        item = await this.questionSetItemRepository.findOne({
          where: { setItemId: params.setItemId },
          relations: ['questionSet', 'question']
        });
      } else {
        item = await this.questionSetItemRepository.findOne({
          where: { setId: params.setId, questionId: params.questionId },
          relations: ['questionSet', 'question']
        });
      }

      if (!item) {
        return this.createErrorResult('Question set item not found', 'Question set item not found');
      }

      const questionSet = item.questionSet;
      const question = item.question;

      await this.questionSetItemRepository.remove(item);

      return this.createSuccessResult(
        {
          setItemId: item.setItemId,
          setId: item.setId,
          questionId: item.questionId
        },
        `Question removed from question set "${questionSet?.title || 'Unknown'}" successfully`
      );
    } catch (error) {
      return this.createErrorResult('Remove failed', error.message);
    }
  }

  private async getQuestionsInSet(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setId) {
      return this.createErrorResult('Missing required field', 'setId is required for get_questions action');
    }

    try {
      const questionSet = await this.questionSetRepository.findOne({
        where: { setId: params.setId }
      });

      if (!questionSet) {
        return this.createErrorResult('Question set not found', `Question set with ID ${params.setId} not found`);
      }

      const items = await this.questionSetItemRepository.find({
        where: { setId: params.setId },
        relations: ['question']
      });

      const questions = items.map(item => ({
        setItemId: item.setItemId,
        questionId: item.question?.questionId,
        content: item.question?.content,
        sampleAnswer: item.question?.sampleAnswer,
        difficulty: item.question?.difficulty
      }));

      return this.createSuccessResult(
        {
          setId: params.setId,
          title: questionSet.title,
          questions,
          total: questions.length
        },
        `Found ${questions.length} question(s) in question set "${questionSet.title}"`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async getQuestionSetStats(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.setId) {
      return this.createErrorResult('Missing required field', 'setId is required for get_stats action');
    }

    try {
      const questionSet = await this.questionSetRepository.findOne({
        where: { setId: params.setId },
        relations: ['questionSetItems', 'questionSetItems.question', 'jobPostings']
      });

      if (!questionSet) {
        return this.createErrorResult('Question set not found', `Question set with ID ${params.setId} not found`);
      }

      const questions = questionSet.questionSetItems?.map(item => item.question).filter(Boolean) || [];
      
      const difficultyBreakdown = questions.reduce((acc: any, q: any) => {
        const diff = q.difficulty || 'unknown';
        acc[diff] = (acc[diff] || 0) + 1;
        return acc;
      }, {});

      return this.createSuccessResult(
        {
          setId: questionSet.setId,
          title: questionSet.title,
          totalQuestions: questions.length,
          totalJobs: questionSet.jobPostings?.length || 0,
          difficultyBreakdown,
          createdAt: questionSet.createdAt
        },
        `Question set "${questionSet.title}" statistics: ${questions.length} question(s), ${questionSet.jobPostings?.length || 0} job(s)`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }
}

