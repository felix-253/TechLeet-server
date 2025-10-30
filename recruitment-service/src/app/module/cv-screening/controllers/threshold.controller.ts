import {
   Controller,
   Get,
   Post,
   Param,
   Body,
   Query,
   HttpStatus,
   ParseIntPipe,
   NotFoundException,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiBearerAuth,
   ApiParam,
   ApiQuery,
} from '@nestjs/swagger';
import { AdaptiveThresholdService } from '../services/adaptive-threshold.service';

@ApiTags('Adaptive Threshold')
@ApiBearerAuth('token')
@Controller('cv-screening/adaptive-threshold')
export class ThresholdController {
   constructor(
      private readonly adaptiveThresholdService: AdaptiveThresholdService,
   ) {}

   @Get('stats/:jobPostingId')
   @ApiOperation({
      summary: 'Lấy thống kê Adaptive Threshold cho job posting',
      description: 'Lấy thống kê về ngưỡng sàng lọc động cho một job posting cụ thể',
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'ID của job posting',
      example: 1,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Thống kê Adaptive Threshold',
      schema: {
         type: 'object',
         properties: {
            n: { type: 'number', example: 25, description: 'Số CV đã xử lý' },
            mean: { type: 'number', example: 0.72, description: 'Trung bình điểm số' },
            threshold: { type: 'number', example: 0.68, description: 'Ngưỡng hiện tại' },
            std: { type: 'number', example: 0.15, description: 'Độ lệch chuẩn' },
         },
      },
   })
   async getAdaptiveThresholdStats(@Param('jobPostingId', ParseIntPipe) jobPostingId: number) {
      const stats = await this.adaptiveThresholdService.getScreeningStats(jobPostingId);
      if (!stats) {
         throw new NotFoundException(`Job posting ${jobPostingId} not found`);
      }
      return stats;
   }

   @Get('passed-cvs/:jobPostingId')
   @ApiOperation({
      summary: 'Lấy danh sách CV đã pass screening',
      description: 'Lấy danh sách ứng viên đã vượt qua sàng lọc cho job posting',
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'ID của job posting',
      example: 1,
   })
   @ApiQuery({
      name: 'limit',
      required: false,
      description: 'Số lượng kết quả tối đa',
      example: 50,
   })
   @ApiQuery({
      name: 'offset',
      required: false,
      description: 'Vị trí bắt đầu',
      example: 0,
   })
   async getPassedCVs(
      @Param('jobPostingId', ParseIntPipe) jobPostingId: number,
      @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
      @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
   ) {
      return this.adaptiveThresholdService.getPassedCVs(jobPostingId, limit, offset);
   }

   @Post('reset/:jobPostingId')
   @ApiOperation({
      summary: 'Reset thống kê Adaptive Threshold',
      description: 'Reset lại thống kê sàng lọc cho một job posting',
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'ID của job posting',
      example: 1,
   })
   async resetAdaptiveThreshold(@Param('jobPostingId', ParseIntPipe) jobPostingId: number) {
      await this.adaptiveThresholdService.resetScreeningStats(jobPostingId);
      return {
         success: true,
         message: 'Screening stats reset successfully',
      };
   }

   @Post('update-k/:jobPostingId')
   @ApiOperation({
      summary: 'Cập nhật hệ số điều chỉnh K',
      description: 'Cập nhật hệ số điều chỉnh ngưỡng cho job posting',
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'ID của job posting',
      example: 1,
   })
   async updateAdaptiveThresholdK(
      @Param('jobPostingId', ParseIntPipe) jobPostingId: number,
      @Body() body: { k: number },
   ) {
      await this.adaptiveThresholdService.updateScreeningK(jobPostingId, body.k);
      return {
         success: true,
         message: 'K coefficient updated successfully',
      };
   }

   @Post('test/:jobPostingId')
   @ApiOperation({
      summary: 'Test thuật toán Adaptive Threshold',
      description: 'Test thuật toán với dữ liệu mẫu',
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'ID của job posting',
      example: 1,
   })
   async testAdaptiveThreshold(
      @Param('jobPostingId', ParseIntPipe) jobPostingId: number,
      @Body() body: { testScores: number[] },
   ) {
      const results = await this.adaptiveThresholdService.testAdaptiveThreshold(
         jobPostingId,
         body.testScores,
      );
      return { results: results as any };
   }
}

