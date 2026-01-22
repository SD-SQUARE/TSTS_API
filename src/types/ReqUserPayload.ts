export type ReqUserPayload = {
  name?: TokenName;
  id: string;
  email: string;
  role: string;
  permission_profile?: Record<string, unknown>;
};

type LangPair = { ar: string; en: string };

type TokenName = {
  first: LangPair;
  mid?: LangPair;
  last: LangPair;
};
