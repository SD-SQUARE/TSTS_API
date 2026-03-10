/**
 * String utility functions for reports
 */
export class StringUtils {
  /**
   * Truncate text to fit within a specific character limit and add ellipsis
   * @param text - The text to truncate
   * @param maxLength - Maximum number of characters
   * @param ellipsis - The ellipsis string to append (default: "...")
   * @returns Truncated text with ellipsis if needed
   */
  static truncateWithEllipsis(
    text: string,
    maxLength: number,
    ellipsis: string = "..."
  ): string {
    if (!text) return "";
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  }

  /**
   * Estimate character limit based on column width in points
   * Rough estimation: 1 character ≈ 6 points for normal font (size 10-11)
   * @param widthInPoints - Column width in points
   * @param fontSize - Font size (default: 10)
   * @returns Estimated maximum characters
   */
  static estimateMaxCharsFromWidth(
    widthInPoints: number,
    fontSize: number = 10
  ): number {
    // Average character width is approximately 0.6 * fontSize
    const avgCharWidth = fontSize * 0.6;
    
    // Account for cell padding (typically 10 points on each side)
    const availableWidth = widthInPoints - 20;
    
    return Math.floor(availableWidth / avgCharWidth);
  }

  /**
   * Truncate text to fit within a specific width in points
   * @param text - The text to truncate
   * @param widthInPoints - Available width in points
   * @param fontSize - Font size (default: 10)
   * @param ellipsis - The ellipsis string to append (default: "...")
   * @returns Truncated text with ellipsis if needed
   */
  static truncateToWidth(
    text: string,
    widthInPoints: number,
    fontSize: number = 10,
    ellipsis: string = "..."
  ): string {
    const maxChars = this.estimateMaxCharsFromWidth(widthInPoints, fontSize);
    return this.truncateWithEllipsis(text, maxChars, ellipsis);
  }

  /**
   * Truncate text for dynamic width columns (marked with '*')
   * Uses a reasonable default based on A4 page width
   * @param text - The text to truncate
   * @param fontSize - Font size (default: 10)
   * @param ellipsis - The ellipsis string to append (default: "...")
   * @returns Truncated text with ellipsis if needed
   */
  static truncateForDynamicColumn(
    text: string,
    fontSize: number = 10,
    ellipsis: string = "..."
  ): string {
    // A4 width is 595 points, minus margins and other columns
    // Assume dynamic column gets approximately 350 points
    const estimatedWidth = 350;
    return this.truncateToWidth(text, estimatedWidth, fontSize, ellipsis);
  }
}
