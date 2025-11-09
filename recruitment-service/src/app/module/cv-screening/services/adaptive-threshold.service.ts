import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { FilterScoreEntity } from '../../../../entities/recruitment/filter-score.entity';

// Định nghĩa cấu trúc dữ liệu cho trạng thái sàng lọc
export interface IScreeningState {
   n: number;
   mean: number;
   m2: number;
   k: number;
   minThreshold: number;
   maxThreshold: number;
}

const SEED_THRESHOLD = 70.0;
const SEED_WEIGHT = 30;
const SMOOTHING_FACTOR = 0.05;
const MAX_THRESHOLD_STEP = 0.5;
const MIN_THRESHOLD_LIMIT = 60.0;

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
    * Cập nhật trạng thái sàng lọc với một điểm số CV mới (thang 0-100).
    * @param currentState Trạng thái thống kê hiện tại (lấy từ CSDL).
    * @param newScore Điểm của CV mới (0-100).
    * @returns {IScreeningResult} Trạng thái mới, ngưỡng mới, và quyết định pass/fail.
    */
   private updateAdaptiveThreshold(
      currentState: IScreeningState,
      newScore: number,
      previousThreshold?: number,
      decisionOverride?: 'pass' | 'fail',
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
      let smoothedThreshold = rawThreshold;
      if (previousThreshold !== undefined) {
         smoothedThreshold =
            previousThreshold + SMOOTHING_FACTOR * (rawThreshold - previousThreshold);
         const deltaThreshold = smoothedThreshold - previousThreshold;
         if (deltaThreshold > MAX_THRESHOLD_STEP) {
            smoothedThreshold = previousThreshold + MAX_THRESHOLD_STEP;
         } else if (deltaThreshold < -MAX_THRESHOLD_STEP) {
            smoothedThreshold = previousThreshold - MAX_THRESHOLD_STEP;
         }
      }
      let newThreshold = Math.max(currentState.minThreshold, smoothedThreshold);
      if (newThreshold < MIN_THRESHOLD_LIMIT) {
         newThreshold = MIN_THRESHOLD_LIMIT;
      }
      newThreshold = Math.min(currentState.maxThreshold, newThreshold);

      // --- Ra quyết định ---
      const decision =
         decisionOverride !== undefined
            ? decisionOverride
            : newScore >= newThreshold
               ? 'pass'
               : 'fail';

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
         // Kiểm tra job posting có tồn tại không và lấy thông tin vacancies
         const jobPosting = await this.jobPostingRepository
            .createQueryBuilder('job')
            .where('job.jobPostingId = :jobPostingId', { jobPostingId })
            .getOne();

         if (!jobPosting) {
            throw new Error(`Job posting ${jobPostingId} not found`);
         }

         // Lấy trạng thái hiện tại từ filter_score
         const currentFilterScore = await this.filterScoreRepository.findOne({
            where: { jobPostingId },
         });

        let currentState: IScreeningState;
        let previousThreshold: number | undefined;

         if (!currentFilterScore) {
            // CV đầu tiên - tạo record filter_score mới
            this.logger.log(`Creating first filter_score record for job ${jobPostingId}`);

            currentState = {
               n: SEED_WEIGHT,
               mean: SEED_THRESHOLD,
               m2: 0.0,
               k: 0.0,
               minThreshold: 0.0,
               maxThreshold: 100.0,
            };

            // Tạo record filter_score mới với thang điểm 0-100 (mặc định 70%)
            await this.filterScoreRepository.save({
               jobPostingId,
               screeningN: SEED_WEIGHT,
               screeningMean: SEED_THRESHOLD,
               screeningM2: 0.0,
               screeningThreshold: SEED_THRESHOLD,
               screeningK: 0.0,
               screeningMinThreshold: 0.0,
               screeningMaxThreshold: 100.0,
            });
            previousThreshold = SEED_THRESHOLD;
         } else {
            // Đã có record - lấy trạng thái hiện tại
         const filter = currentFilterScore;
            currentState = {
               n: filter.screeningN ?? SEED_WEIGHT,
               mean: parseFloat(filter.screeningMean?.toString() || SEED_THRESHOLD.toString()),
               m2: parseFloat(filter.screeningM2?.toString() || '0'),
               k: parseFloat(filter.screeningK?.toString() || '0.0'),
               minThreshold: parseFloat(filter.screeningMinThreshold?.toString() || '0.0'),
               maxThreshold: parseFloat(filter.screeningMaxThreshold?.toString() || '100.0'),
            };
            if (currentState.n < 1) {
               currentState.n = SEED_WEIGHT;
            }
            previousThreshold = parseFloat(
               filter.screeningThreshold?.toString() || SEED_THRESHOLD.toString(),
            );
         }

         // === Bổ sung logic Dynamic K ===
         // Tính toán hệ số k động dựa trên số CV đã pass và số vị trí tuyển dụng
         const INTERVIEW_BUFFER = 5; // Mục tiêu phỏng vấn 5 người / vị trí
         const N_slots = jobPosting.vacancies || 1;
         const TargetPassed = N_slots * INTERVIEW_BUFFER;

         // Đếm số CV đã pass thực tế
         const N_passed = await this.applicationRepository.count({
            where: { jobPostingId, status: 'screening_passed' },
         });

         // Tính toán sai số (error > 0 nghĩa là thừa CV, error < 0 nghĩa là thiếu CV)
         const error = N_passed - TargetPassed;

         // Tính toán k mới dựa trên error
         const k_base = 0.0; // Giờ k_base có thể là 0 (mặc định lấy 50% CV trên mean)
         const k_adjustment_factor = 0.1; // Độ nhạy của hệ thống

         let dynamic_k = k_base + error * k_adjustment_factor;

         // Giới hạn k trong khoảng hợp lý (-1.0 đến 2.0)
         dynamic_k = Math.max(-1.0, Math.min(2.0, dynamic_k));

         // Cập nhật currentState.k với giá trị dynamic k
         const currentStateWithDynamicK: IScreeningState = {
            ...currentState,
            k: dynamic_k,
         };

         this.logger.log(
            `Dynamic K calculation: N_slots=${N_slots}, TargetPassed=${TargetPassed}, N_passed=${N_passed}, error=${error}, k_dynamic=${dynamic_k.toFixed(3)}`,
         );

         // Áp dụng thuật toán Adaptive Threshold với dynamic k
         let priorStd = 0;
         if (currentStateWithDynamicK.n > 1) {
            priorStd = Math.sqrt(currentStateWithDynamicK.m2 / (currentStateWithDynamicK.n - 1));
         }
         const priorRawThreshold =
            currentStateWithDynamicK.mean + currentStateWithDynamicK.k * priorStd;
         const priorThresholdBase =
            previousThreshold !== undefined ? previousThreshold : priorRawThreshold;
         const priorThreshold = Math.min(
            currentStateWithDynamicK.maxThreshold,
            Math.max(currentStateWithDynamicK.minThreshold, priorThresholdBase),
         );
         console.log('priorThreshold',cvScore, priorThreshold);
         const priorDecision = cvScore >= priorThreshold ? 'pass' : 'fail';

         const result = this.updateAdaptiveThreshold(
            currentStateWithDynamicK,
            cvScore,
            previousThreshold,
            priorDecision,
         );

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
            `Job ${jobPostingId}: CV score ${cvScore.toFixed(3)} → ${result.decision.toUpperCase()} | threshold=${result.newThreshold.toFixed(3)} | mean=${result.newState.mean.toFixed(3)} | n=${result.newState.n} | k=${dynamic_k.toFixed(3)}`,
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
         const mean = parseFloat(filter.screeningMean?.toString() || '70');
         const m2 = parseFloat(filter.screeningM2?.toString() || '0');
         const threshold = parseFloat(filter.screeningThreshold?.toString() || '70');
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
               screeningN: SEED_WEIGHT,
               screeningMean: SEED_THRESHOLD,
               screeningM2: 0.0,
               screeningThreshold: SEED_THRESHOLD,
               screeningK: 0.0,
               screeningMinThreshold: 0.0,
               screeningMaxThreshold: 100.0,
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
