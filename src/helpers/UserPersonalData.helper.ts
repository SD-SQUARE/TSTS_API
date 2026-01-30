import { User } from "../entities/User.js";
import { Lang } from "../types/lang.types.js";

const pickStrict = (
  obj: { en?: string; ar?: string } | undefined,
  lang: Lang,
): string => {
  // STRICT: do not fallback to the other language
  return (obj?.[lang] ?? "").trim();
};

export const getFullNameByLang = (user: User, lang: Lang = "en"): string => {
  const first = pickStrict(user.firstName, lang);
  const mid = pickStrict(user.midName, lang);
  const last = pickStrict(user.lastName, lang);

  const fullName = [first, mid, last].filter((p) => p.length > 0).join(" ");

  return fullName;
};
