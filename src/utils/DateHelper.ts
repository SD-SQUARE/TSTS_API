import { formatNumber } from "./NumberHelper.js";

export const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const formatDateForReport = (
  date: string | Date,
  lang?: string,
): string => {
  const dateObj = new Date(date);
  const isRTL = lang === "ar";

  // Get day, month, and year in numeric format
  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();

  // Format numbers based on language
  const dayFormatted = formatNumber(day, isRTL);
  const monthFormatted = formatNumber(month, isRTL);
  const yearFormatted = formatNumber(year, isRTL);

  // Return the date formatted as "day/month/year"
  return `${dayFormatted}/${monthFormatted}/${yearFormatted}`;
};

export const formatDateTimeForReport = (
  date: string | Date,
  lang?: string,
): string => {
  const dateObj = new Date(date);
  const isRTL = lang === "ar";

  // Get day, month, and year in numeric format
  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();

  // Get hours and minutes in numeric format
  const hours = dateObj.getHours().toString().padStart(2, "0");
  const minutes = dateObj.getMinutes().toString().padStart(2, "0");

  // Format numbers based on language
  const dayFormatted = formatNumber(day, isRTL);
  const monthFormatted = formatNumber(month, isRTL);
  const yearFormatted = formatNumber(year, isRTL);
  const hoursFormatted = formatNumber(hours, isRTL);
  const minutesFormatted = formatNumber(minutes, isRTL);

  // Return the date and time formatted as "day/month/year hours:minutes"
  return `${dayFormatted}/${monthFormatted}/${yearFormatted} ${hoursFormatted}:${minutesFormatted}`;
};

export const isDateInRange = (
  date: Date,
  startDate?: Date | string,
  endDate?: Date | string,
): boolean => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
};

export const parseDate = (
  date: Date | string | undefined,
): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date;

  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

export const formatDateForDisplay = (
  date: Date | string | undefined,
): string => {
  if (!date) return "N/A";

  const d = parseDate(date);
  if (!d) return "Invalid Date";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
