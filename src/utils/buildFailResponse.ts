import { t } from "i18next";

type ApiErrorItem = { key: string; message: string };

export const buildFailResponse = <TFlag extends string>(
  flagKey: TFlag, // "is_edited" | "is_created" | ...
  messageKey: string,
  errors: ApiErrorItem[]
): Record<TFlag, false> & { message: string; errors: ApiErrorItem[] } =>
  ({
    [flagKey]: false,
    message: t(messageKey),
    errors,
  } as any);
