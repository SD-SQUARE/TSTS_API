import {
  parsePageIndex,
  parsePageSize,
} from "../../helpers/paginationHelper.js";
import { IPagination } from "../shared/IPagination.js";

export interface ISpecializationsForUser extends IPagination {
  userId: string;
  name?: string;
}

export const parseSpecializationsForUserQuery = (
  params: any,
  q: any,
): ISpecializationsForUser => {
  return {
    userId: params.id,
    name: q.name,
    page_index: parsePageIndex(q.page_index),
    page_size: parsePageSize(q.page_size),
  };
};
