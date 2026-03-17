import { Lang } from "../types/lang.types.js";

type LocalizedText = {
  ar?: string;
  en?: string;
};

export const buildLocalizedName = (
  user: {
    firstName?: LocalizedText;
    midName?: LocalizedText;
    lastName?: LocalizedText;
  },
  lang: Lang,
) => {
  const parts = [
    user.firstName?.[lang],
    user.midName?.[lang],
    user.lastName?.[lang],
  ];

  return parts.filter(Boolean).join(" ");
};
