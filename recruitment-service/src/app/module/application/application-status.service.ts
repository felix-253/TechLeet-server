import { Injectable, BadRequestException, Logger } from '@nestjs/common';

/**
 * Application status values
 */
export enum ApplicationStatus {
   SUBMITTED = 'submitted',
   SCREENING = 'screening',
   SCREENING_PASSED = 'screening_passed',
   SCREENING_FAILED = 'screening_failed',
   INTERVIEWING = 'interviewing',
   OFFER = 'offer',
   HIRED = 'hired',
   REJECTED = 'rejected',
   WITHDRAWN = 'withdrawn',
}

/**
 * Valid status transitions map
 * Key: current status, Value: array of valid next statuses
 */
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
   [ApplicationStatus.SUBMITTED]: [
      ApplicationStatus.SCREENING,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
   ],
   [ApplicationStatus.SCREENING]: [
      ApplicationStatus.SCREENING_PASSED,
      ApplicationStatus.SCREENING_FAILED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
   ],
   [ApplicationStatus.SCREENING_PASSED]: [
      ApplicationStatus.INTERVIEWING,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
   ],
   [ApplicationStatus.SCREENING_FAILED]: [
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
      // Allow re-screening in special cases
      ApplicationStatus.SCREENING,
   ],
   [ApplicationStatus.INTERVIEWING]: [
      ApplicationStatus.OFFER,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
   ],
   [ApplicationStatus.OFFER]: [
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
   ],
   [ApplicationStatus.HIRED]: [
      // Terminal state - no transitions allowed
   ],
   [ApplicationStatus.REJECTED]: [
      // Terminal state - but can be reconsidered
      ApplicationStatus.SCREENING,
   ],
   [ApplicationStatus.WITHDRAWN]: [
      // Terminal state - candidate can re-apply
   ],
};

/**
 * Status colors for UI display
 */
export const STATUS_COLORS: Record<ApplicationStatus, string> = {
   [ApplicationStatus.SUBMITTED]: 'blue',
   [ApplicationStatus.SCREENING]: 'yellow',
   [ApplicationStatus.SCREENING_PASSED]: 'teal',
   [ApplicationStatus.SCREENING_FAILED]: 'orange',
   [ApplicationStatus.INTERVIEWING]: 'purple',
   [ApplicationStatus.OFFER]: 'indigo',
   [ApplicationStatus.HIRED]: 'green',
   [ApplicationStatus.REJECTED]: 'red',
   [ApplicationStatus.WITHDRAWN]: 'gray',
};

/**
 * Status descriptions for display
 */
export const STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
   [ApplicationStatus.SUBMITTED]: 'Application submitted, awaiting review',
   [ApplicationStatus.SCREENING]: 'CV screening in progress',
   [ApplicationStatus.SCREENING_PASSED]: 'CV screening passed, ready for interview',
   [ApplicationStatus.SCREENING_FAILED]: 'CV screening did not meet requirements',
   [ApplicationStatus.INTERVIEWING]: 'Interview process in progress',
   [ApplicationStatus.OFFER]: 'Offer extended to candidate',
   [ApplicationStatus.HIRED]: 'Candidate hired',
   [ApplicationStatus.REJECTED]: 'Application rejected',
   [ApplicationStatus.WITHDRAWN]: 'Application withdrawn by candidate',
};

@Injectable()
export class ApplicationStatusService {
   private readonly logger = new Logger(ApplicationStatusService.name);

   /**
    * Check if a status transition is valid
    */
   isValidTransition(currentStatus: string, newStatus: string): boolean {
      const current = currentStatus as ApplicationStatus;
      const next = newStatus as ApplicationStatus;

      // If current status is not in our map, allow any transition (for backwards compatibility)
      if (!VALID_TRANSITIONS[current]) {
         this.logger.warn(`Unknown current status: ${currentStatus}`);
         return true;
      }

      return VALID_TRANSITIONS[current].includes(next);
   }

   /**
    * Validate a status transition and throw if invalid
    */
   validateTransition(currentStatus: string, newStatus: string): void {
      if (!this.isValidTransition(currentStatus, newStatus)) {
         const validStatuses = this.getValidNextStatuses(currentStatus);
         throw new BadRequestException(
            `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
            `Valid transitions: ${validStatuses.join(', ') || 'none (terminal state)'}`,
         );
      }
   }

   /**
    * Get valid next statuses for a given current status
    */
   getValidNextStatuses(currentStatus: string): ApplicationStatus[] {
      const current = currentStatus as ApplicationStatus;
      return VALID_TRANSITIONS[current] || [];
   }

   /**
    * Check if a status is terminal (no further transitions allowed)
    */
   isTerminalStatus(status: string): boolean {
      return this.getValidNextStatuses(status).length === 0;
   }

   /**
    * Get status color for UI display
    */
   getStatusColor(status: string): string {
      return STATUS_COLORS[status as ApplicationStatus] || 'gray';
   }

   /**
    * Get status description
    */
   getStatusDescription(status: string): string {
      return STATUS_DESCRIPTIONS[status as ApplicationStatus] || 'Unknown status';
   }

   /**
    * Get all available statuses
    */
   getAllStatuses(): ApplicationStatus[] {
      return Object.values(ApplicationStatus);
   }

   /**
    * Check if a status represents a positive outcome
    */
   isPositiveStatus(status: string): boolean {
      const positiveStatuses = [
         ApplicationStatus.SCREENING_PASSED,
         ApplicationStatus.INTERVIEWING,
         ApplicationStatus.OFFER,
         ApplicationStatus.HIRED,
      ];
      return positiveStatuses.includes(status as ApplicationStatus);
   }

   /**
    * Check if a status represents a negative outcome
    */
   isNegativeStatus(status: string): boolean {
      const negativeStatuses = [
         ApplicationStatus.SCREENING_FAILED,
         ApplicationStatus.REJECTED,
         ApplicationStatus.WITHDRAWN,
      ];
      return negativeStatuses.includes(status as ApplicationStatus);
   }

   /**
    * Check if a status is in-progress
    */
   isInProgressStatus(status: string): boolean {
      const inProgressStatuses = [
         ApplicationStatus.SUBMITTED,
         ApplicationStatus.SCREENING,
         ApplicationStatus.SCREENING_PASSED,
         ApplicationStatus.INTERVIEWING,
         ApplicationStatus.OFFER,
      ];
      return inProgressStatuses.includes(status as ApplicationStatus);
   }
}

