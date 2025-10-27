import { Controller, Get } from '@nestjs/common';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
   constructor(private readonly questionService: QuestionService) {}

   @Get('test')
   async test() {
      return this.questionService.test();
   }
}
