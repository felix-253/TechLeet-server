/**
 * Date utility functions for consistent date formatting across services
 */

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 * Handles Date objects, strings, null, and undefined values
 */
export function formatDate(date: Date | string | null | undefined): string | undefined {
   if (!date) return undefined;
   
   const dateObj = date instanceof Date ? date : new Date(date);
   
   // Check for invalid date
   if (isNaN(dateObj.getTime())) {
      return undefined;
   }
   
   return dateObj.toISOString().split('T')[0];
}

/**
 * Format a date to ISO datetime string
 */
export function formatDateTime(date: Date | string | null | undefined): string | undefined {
   if (!date) return undefined;
   
   const dateObj = date instanceof Date ? date : new Date(date);
   
   if (isNaN(dateObj.getTime())) {
      return undefined;
   }
   
   return dateObj.toISOString();
}

/**
 * Get current date as ISO date string
 */
export function getCurrentDateString(): string {
   return new Date().toISOString().split('T')[0];
}

