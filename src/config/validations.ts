// English text used by entity names/descriptions.
export const ENGLISH_REGEX = /^[\p{L}\p{N}\s.,!?'"()@&$\/-]+$/u;
// Arabic Unicode ranges (common set), numbers, and common punctuation.
export const ARABIC_REGEX =
 
  /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\p{N}\s.,!?'"()@&$\/-]+$/u;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// requires the password to be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one digit, and one special character from a defined set
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Must contain at least one uppercase letter
export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;

// Must contain at least one digit
export const PASSWORD_NUMBER_REGEX = /[0-9]/;

// Must contain at least one special character from # ! & @
export const PASSWORD_SPECIAL_CHAR_REGEX = /[#!&@]/;

// Egyptian National ID (14 digits, valid date + governorate)
export const EGYPTIAN_SSN_REGEX =
  /^(2|3)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(01|02|03|04|11|12|13|14|15|16|17|18|19|21|22|23|24|25|26|27|28|29)\d{5}$/;
