// English letters and spaces
export const ENGLISH_REGEX = /^[A-Za-z\s]+$/;

// Arabic Unicode ranges (common set) - allow spaces
export const ARABIC_REGEX = /^[\u0600-\u06FF\s\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/u;
