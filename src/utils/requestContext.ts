import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  userId?: string;
  ip?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export const setRequestContext = (context: RequestContext) => {
  asyncLocalStorage.enterWith(context);
};

export const getRequestContext = (): RequestContext => {
  return asyncLocalStorage.getStore() || {};
};
