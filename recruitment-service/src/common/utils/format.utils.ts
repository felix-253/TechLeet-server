/**
 * Formatting utility functions for consistent display across services
 */

/**
 * Format salary amount to Vietnamese number format
 * @param amount - Salary amount
 * @returns Formatted string with thousand separators
 */
export function formatSalary(amount: number): string {
   return new Intl.NumberFormat('vi-VN').format(amount);
}

/**
 * Format salary range for display
 * @param minSalary - Minimum salary (optional)
 * @param maxSalary - Maximum salary (optional)
 * @param currency - Currency string (default: 'VND')
 * @returns Formatted salary range string
 */
export function formatSalaryRange(
   minSalary?: number | null,
   maxSalary?: number | null,
   currency: string = 'VND'
): string | null {
   if (minSalary && maxSalary) {
      return `${formatSalary(minSalary)} - ${formatSalary(maxSalary)} ${currency}`;
   }
   if (minSalary) {
      return `From ${formatSalary(minSalary)} ${currency}`;
   }
   if (maxSalary) {
      return `Up to ${formatSalary(maxSalary)} ${currency}`;
   }
   return null;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, locale: string = 'vi-VN'): string {
   return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 1): string {
   return `${value.toFixed(decimals)}%`;
}

