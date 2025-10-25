import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { FilterScoreEntity } from '../../../entities/recruitment/filter-score.entity';

// Định nghĩa cấu trúc dữ liệu cho trạng thái sàng lọc
export interface IScreeningState {
   n: number;
   mean: number;
   m2: number;
   k: number;
   minThreshold: number;
   maxThreshold: number;
}

// Định nghĩa kết quả trả về
export interface IScreeningResult {
   newState: IScreeningState; // Trạng thái mới để lưu vào CSDL
   newThreshold: number; // Ngưỡng mới vừa được tính
   decision: 'pass' | 'fail'; // Quyết định cho CV này
}

@Injectable()
export class AdaptiveThresholdService {
   private readonly logger = new Logger(AdaptiveThresholdService.name);

   constructor(
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(FilterScoreEntity)
      private readonly filterScoreRepository: Repository<FilterScoreEntity>,
   ) {}

   /**
    * Cập nhật trạng thái sàng lọc với một điểm số CV mới.
    * @param currentState Trạng thái thống kê hiện tại (lấy từ CSDL).
    * @param newScore Điểm của CV mới (từ 0.0 đến 1.0).
    * @returns {IScreeningResult} Trạng thái mới, ngưỡng mới, và quyết định pass/fail.
    */
   private updateAdaptiveThreshold(
      currentState: IScreeningState,
      newScore: number,
   ): IScreeningResult {
      // --- Thuật toán Welford ---
      const n = currentState.n + 1;

      // delta = x_n - μ_{n-1}
      const delta = newScore - currentState.mean;

      // μ_n = μ_{n-1} + delta / n
      const mean = currentState.mean + delta / n;

      // delta2 = x_n - μ_n
      const delta2 = newScore - mean;

      // M2_n = M2_{n-1} + delta * delta2
      const m2 = currentState.m2 + delta * delta2;
      // --- Kết thúc Welford ---

      let stdDev = 0;
      if (n > 1) {
         const variance = m2 / (n - 1); // Phương sai mẫu (sample variance)
         stdDev = Math.sqrt(variance);
      }

      // --- Quy tắc Ngưỡng Thích Ứng ---

      // T_n = μ_n + k * σ_n
      const rawThreshold = mean + currentState.k * stdDev;

      // "Kẹp" (Clip) ngưỡng T_n trong khoảng [min, max]
      let newThreshold = Math.max(currentState.minThreshold, rawThreshold);
      newThreshold = Math.min(currentState.maxThreshold, newThreshold);

      // --- Ra quyết định ---
      const decision = newScore >= newThreshold ? 'pass' : 'fail';

      // Chuẩn bị trạng thái mới để lưu vào CSDL
      const newState: IScreeningState = {
         n: n,
         mean: mean,
         m2: m2,
         k: currentState.k, // k, min, max không đổi
         minThreshold: currentState.minThreshold,
         maxThreshold: currentState.maxThreshold,
      };

      return { newState, newThreshold, decision };
   }

   /**
    * Xử lý CV mới với thuật toán Adaptive Threshold
    */
   async processNewCV(jobPostingId: number, cvScore: number): Promise<IScreeningResult> {
      try {
         // Kiểm tra job posting có tồn tại không
         const jobExists = await this.jobPostingRepository
            .createQueryBuilder('job')
            .where('job.jobPostingId = :jobPostingId', { jobPostingId })
            .getOne();

         if (!jobExists) {
            throw new Error(`Job posting ${jobPostingId} not found`);
         }

         // Lấy trạng thái hiện tại từ filter_score
         const currentFilterScore = await this.filterScoreRepository.findOne({
            where: { jobPostingId },
         });

         let currentState: IScreeningState;

         if (!currentFilterScore) {
            // CV đầu tiên - tạo record filter_score mới
            this.logger.log(`Creating first filter_score record for job ${jobPostingId}`);

            currentState = {
               n: 0,
               mean: 0.0,
               m2: 0.0,
               k: 0.5,
               minThreshold: 0.0,
               maxThreshold: 1.0,
            };

            // Tạo record filter_score mới
            await this.filterScoreRepository.save({
               jobPostingId,
               screeningN: 0,
               screeningMean: 0.0,
               screeningM2: 0.0,
               screeningThreshold: 0.6,
               screeningK: 0.5,
               screeningMinThreshold: 0.0,
               screeningMaxThreshold: 1.0,
            });
         } else {
            // Đã có record - lấy trạng thái hiện tại
            const filter = currentFilterScore;
            currentState = {
               n: filter.screeningN || 0,
               mean: parseFloat(filter.screeningMean?.toString() || '0'),
               m2: parseFloat(filter.screeningM2?.toString() || '0'),
               k: parseFloat(filter.screeningK?.toString() || '0.5'),
               minThreshold: parseFloat(filter.screeningMinThreshold?.toString() || '0.0'),
               maxThreshold: parseFloat(filter.screeningMaxThreshold?.toString() || '1.0'),
            };
         }

         // Áp dụng thuật toán Adaptive Threshold
         const result = this.updateAdaptiveThreshold(currentState, cvScore);

         // Cập nhật filter_score với trạng thái mới
         await this.filterScoreRepository.update(
            { jobPostingId },
            {
               screeningN: result.newState.n,
               screeningMean: result.newState.mean,
               screeningM2: result.newState.m2,
               screeningThreshold: result.newThreshold,
               updatedAt: new Date(),
            },
         );

         this.logger.log(
            `Job ${jobPostingId}: CV score ${cvScore.toFixed(3)} → ${result.decision.toUpperCase()} | threshold=${result.newThreshold.toFixed(3)} | mean=${result.newState.mean.toFixed(3)} | n=${result.newState.n}`,
         );

         return result;
      } catch (error) {
         this.logger.error(
            `Error processing CV for job ${jobPostingId}: ${error.message}`,
            error.stack,
         );
         throw error;
      }
   }

   /**
    * Lấy thống kê sàng lọc cho job posting
    */
   async getScreeningStats(jobPostingId: number): Promise<{
      n: number;
      mean: number;
      threshold: number;
      std: number;
   } | null> {
      try {
         const filter = await this.filterScoreRepository.findOne({
            where: { jobPostingId },
         });

         if (!filter) {
            return null;
         }
         const n = filter.screeningN || 0;
         const mean = parseFloat(filter.screeningMean?.toString() || '0');
         const m2 = parseFloat(filter.screeningM2?.toString() || '0');
         const threshold = parseFloat(filter.screeningThreshold?.toString() || '0.6');
         const std = n > 1 ? Math.sqrt(m2 / (n - 1)) : 0;

         return {
            n,
            mean: Number(mean.toFixed(3)),
            threshold: Number(threshold.toFixed(3)),
            std: Number(std.toFixed(3)),
         };
      } catch (error) {
         this.logger.error(`Error getting screening stats: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Lấy danh sách CV đã pass screening
    */
   async getPassedCVs(
      jobPostingId: number,
      limit = 50,
      offset = 0,
   ): Promise<{
      applications: any[];
      total: number;
      stats: {
         n: number;
         mean: number;
         threshold: number;
         std: number;
      };
   }> {
      try {
         // Lấy thống kê screening
         const stats = await this.getScreeningStats(jobPostingId);
         if (!stats) {
            throw new Error(`Job posting ${jobPostingId} not found`);
         }

         // Lấy danh sách applications đã pass
         const queryBuilder = this.applicationRepository
            .createQueryBuilder('app')
            .leftJoin('app.candidate', 'candidate')
            .addSelect([
               'candidate.candidateId',
               'candidate.firstName',
               'candidate.lastName',
               'candidate.email',
               'candidate.phoneNumber',
               'candidate.yearsOfExperience',
               'candidate.skills',
               'candidate.summary',
            ])
            .where('app.jobPostingId = :jobPostingId', { jobPostingId })
            .andWhere('app.status = :status', { status: 'screening_passed' })
            .andWhere('app.screeningScore IS NOT NULL')
            .orderBy('app.screeningScore', 'DESC');

         // Đếm tổng số
         const total = await queryBuilder.getCount();

         // Áp dụng pagination
         queryBuilder.limit(limit).offset(offset);

         const applications = await queryBuilder.getMany();

         return {
            applications,
            total,
            stats,
         };
      } catch (error) {
         this.logger.error(
            `Error getting passed CVs for job ${jobPostingId}: ${error.message}`,
            error.stack,
         );
         throw error;
      }
   }

   /**
    * Reset thống kê sàng lọc cho job posting
    */
   async resetScreeningStats(jobPostingId: number): Promise<void> {
      try {
         await this.filterScoreRepository.update(
            { jobPostingId },
            {
               screeningN: 0,
               screeningMean: 0.0,
               screeningM2: 0.0,
               screeningThreshold: 0.6,
               updatedAt: new Date(),
            },
         );

         this.logger.log(`Reset screening stats for job posting ${jobPostingId}`);
      } catch (error) {
         this.logger.error(`Error resetting screening stats: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Cập nhật hệ số điều chỉnh K
    */
   async updateScreeningK(jobPostingId: number, k: number): Promise<void> {
      if (k < 0 || k > 2) {
         throw new Error('K coefficient must be between 0 and 2');
      }

      try {
         await this.filterScoreRepository.update(
            { jobPostingId },
            {
               screeningK: k,
               updatedAt: new Date(),
            },
         );

         this.logger.log(`Updated screening K coefficient to ${k} for job posting ${jobPostingId}`);
      } catch (error) {
         this.logger.error(`Error updating K coefficient: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Test thuật toán với dữ liệu mẫu
    */
   async testAdaptiveThreshold(
      jobPostingId: number,
      testScores: number[],
   ): Promise<IScreeningResult[]> {
      const results: IScreeningResult[] = [];

      // Reset stats trước khi test
      await this.resetScreeningStats(jobPostingId);

      for (let i = 0; i < testScores.length; i++) {
         const result = await this.processNewCV(jobPostingId, testScores[i]);
         results.push(result);

         this.logger.log(
            `Test ${i + 1}: Score ${testScores[i].toFixed(2)} → ${result.decision.toUpperCase()} | Threshold: ${result.newThreshold.toFixed(3)} | Mean: ${result.newState.mean.toFixed(3)} | N: ${result.newState.n}`,
         );
      }

      return results;
   }
}
