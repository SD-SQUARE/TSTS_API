import { Request, Response, NextFunction } from "express";

/**
 * A middleware that wraps an async function and catches any errors
 * that occur. If an error occurs, it is passed to the next
 * middleware in the chain.
 * @param {function} fn - The async function to be wrapped.
 * @returns {function} A middleware that wraps the async function.
 * @example
 * const example = async (req, res, next) => {
 *   // code that might throw an error
 * };
 * const wrappedExample = asyncHandler(example);
 * app.use(wrappedExample);
 */
export const asyncHandler =
  (fn: (...args: any[]) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
