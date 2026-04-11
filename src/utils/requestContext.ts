import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  userId?: string;
  ip?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = (context: RequestContext, callback: () => void) => {
  asyncLocalStorage.run(context, callback);
};

export const getRequestContext = (req?: any): RequestContext => {
  // First try AsyncLocalStorage (works for most cases)
  const alsContext = asyncLocalStorage.getStore();
  
  // If AsyncLocalStorage has context, return it
  if (alsContext && alsContext.ip && alsContext.ip !== "unknown") {
    return alsContext;
  }
  
  // Fallback to request object (works with multer and other middleware that break ALS)
  if (req?.context) {
    return req.context;
  }
  
  // Last resort: return what we have or empty object
  return alsContext || {};
};