import {
   Controller,
   Post,
   Body,
   HttpStatus,
   BadRequestException,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiBearerAuth,
} from '@nestjs/swagger';
import { CvScreeningService } from '../cv-screening.service';
import { TestLocalCvDto } from '../cv-screening.dto';

@ApiTags('CV Testing (Development Only)')
@ApiBearerAuth('token')
@Controller('cv-screening/dev')
export class TestingController {
   constructor(
      private readonly screeningService: CvScreeningService,
   ) {}

   @Post('test-local-cv')
   @ApiOperation({
      summary: 'Test CV screening with local file',
      description: 'Test the CV screening pipeline with a local CV file (for development/testing)',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Test screening completed successfully',
      schema: {
         type: 'object',
         properties: {
            success: { type: 'boolean', example: true },
            processingTimeMs: { type: 'number', example: 15000 },
            extractedText: { type: 'string', example: 'CV text content...' },
            processedData: { type: 'object' },
            scores: { type: 'object' },
            summary: { type: 'object' },
            error: { type: 'string' },
         },
      },
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid file path or processing error',
   })
   async testLocalCv(@Body() testDto: TestLocalCvDto) {
      return this.screeningService.testLocalCvScreening(
         testDto.filePath,
         testDto.jobPostingId,
         testDto.mockApplicationId,
         testDto.modelConfig || 'gemini',
      );
   }
}

