/**
 * Convert Western Arabic numerals (0-9) to Eastern Arabic-Indic numerals (٠-٩)
 */
export function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return num
    .toString()
    .split('')
    .map((char) => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : arabicNumerals[digit];
    })
    .join('');
}

/**
 * Format number based on language
 * @param num - The number to format
 * @param isRTL - Whether the language is RTL (Arabic)
 */
export function formatNumber(num: number | string, isRTL: boolean): string {
  return isRTL ? toArabicNumerals(num) : num.toString();
}
