import {
   Controller,
   Get,
   Post,
   Put,
   Delete,
   Body,
   Param,
   ParseIntPipe,
   Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { CreateQuestionDto, UpdateQuestionDto, FilterQuestionDto } from './dto/question.dto';
import {
   CreateQuestionSetDto,
   UpdateQuestionSetDto,
   FilterQuestionSetDto,
} from './dto/question-set.dto';
import { CreateExaminationDto, SubmitExaminationDto, UpdateScoreDto } from './dto/examination.dto';

@ApiTags('Questions')
@Controller('question')
export class QuestionController {
   constructor(private readonly questionService: QuestionService) {}

   @Get('questions')
   @ApiOperation({
      summary: 'Get all questions with pagination',
      description: 'Retrieves a paginated list of questions with optional filtering and sorting',
   })
   @ApiResponse({
      status: 200,
      description: 'Questions retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { type: 'object' },
            },
            total: { type: 'number', example: 25 },
         },
      },
   })
   async getQuestions(@Query() filter: FilterQuestionDto) {
      return this.questionService.findQuestions(filter);
   }

   @Post('questions')
   async createQuestion(@Body() dto: CreateQuestionDto) {
      return this.questionService.createQuestion(dto);
   }

   @Put('questions/:id')
   async updateQuestion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionDto) {
      return this.questionService.updateQuestion(id, dto);
   }

   @Delete('questions/:id')
   async deleteQuestion(@Param('id', ParseIntPipe) id: number) {
      return this.questionService.deleteQuestion(id);
   }

   @Get('question-sets')
   @ApiOperation({
      summary: 'Get all question sets with pagination',
      description:
         'Retrieves a paginated list of question sets with optional filtering and sorting',
   })
   @ApiResponse({
      status: 200,
      description: 'Question sets retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { type: 'object' },
            },
            total: { type: 'number', example: 10 },
         },
      },
   })
   async getQuestionSets(@Query() filter: FilterQuestionSetDto) {
      return this.questionService.findQuestionSets(filter);
   }

   @Post('question-sets')
   async createQuestionSet(@Body() dto: CreateQuestionSetDto) {
      return this.questionService.createQuestionSet(dto);
   }

   @Put('question-sets/:id')
   async updateQuestionSet(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateQuestionSetDto,
   ) {
      return this.questionService.updateQuestionSet(id, dto);
   }

   @Post('question-sets/:setId/items/:questionId')
   async addQuestionToSet(
      @Param('setId', ParseIntPipe) setId: number,
      @Param('questionId', ParseIntPipe) questionId: number,
   ) {
      return this.questionService.addQuestionToSet(setId, questionId);
   }

   @Delete('question-sets/items/:itemId')
   async removeQuestionFromSet(@Param('itemId', ParseIntPipe) itemId: number) {
      return this.questionService.removeQuestionFromSet(itemId);
   }

   @Delete('question-sets/:id')
   async deleteQuestionSet(@Param('id', ParseIntPipe) id: number) {
      return this.questionService.deleteQuestionSet(id);
   }

   @Post('examinations')
   async createExamination(@Body() dto: CreateExaminationDto) {
      return this.questionService.createExamination(dto);
   }

   @Post('examinations/:id/submit')
   async submitExamination(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: SubmitExaminationDto,
   ) {
      return this.questionService.submitExamination(id, dto);
   }

   @Get('examinations/:id')
   async getExaminationDetail(@Param('id', ParseIntPipe) id: number) {
      return this.questionService.getExaminationDetail(id);
   }

   @Put('examinations/score/:id')
   async updateExamScore(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScoreDto) {
      return this.questionService.updateExamScore(id, dto);
   }

   @Post('examinations/:id/revaluate')
   @ApiOperation({
      summary: 'Revaluate examination score',
      description: 'Recalculate average score and update application status based on min_score',
   })
   @ApiParam({ name: 'id', description: 'Examination ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Examination revaluated successfully',
   })
   async revaluateExamination(@Param('id', ParseIntPipe) examinationId: number) {
      return this.questionService.revaluateExamination(examinationId);
   }

   @Get('examinations/todo/:applicationId')
   async getExaminationsToDo(@Param('applicationId', ParseIntPipe) applicationId: number) {
      return this.questionService.getExaminationsToDo(applicationId);
   }
}
