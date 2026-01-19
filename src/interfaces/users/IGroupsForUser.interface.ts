import {
  parsePageIndex,
  parsePageSize,
} from "../../helpers/paginationHelper.js";
import { IPagination } from "../shared/IPagination.js";

export interface IGroupsForUser extends IPagination {
  userId: string;
  name?: string;
}

export const parseGroupsForUserQuery = (
  params: any,
  q: any,
): IGroupsForUser => {
  return {
    userId: params.id,
    name: q.name,
    page_index: parsePageIndex(q.page_index),
    page_size: parsePageSize(q.page_size),
  };
};
