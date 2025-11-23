import { PaginationConstants } from "../constants/pagination.js";

export const parsePageSize = (value: any): number => {
  const num = Number(value);

  if (isNaN(num) || num <= 0) return PaginationConstants.DEFAULT_PAGE_SIZE; // default
  if (num > PaginationConstants.MAX_PAGE_SIZE)
    return PaginationConstants.MAX_PAGE_SIZE; // max limit

  return num;
};

export const parsePageIndex = (value: any): number => {
  const num = Number(value);
  if (isNaN(num) || num < PaginationConstants.DEFAULT_PAGE_INDEX)
    return PaginationConstants.DEFAULT_PAGE_INDEX; // default page index
  return num;
};
