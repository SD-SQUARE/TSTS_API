// English letters and spaces
export const ENGLISH_REGEX = /^[A-Za-z\s]+$/;

// Arabic Unicode ranges (common set) - allow spaces
export const ARABIC_REGEX =
  /^[\u0600-\u06FF\s\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/u;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// requires the password to be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one digit, and one special character from a defined set
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
