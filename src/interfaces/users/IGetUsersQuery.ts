import {
  parsePageIndex,
  parsePageSize,
} from "../../helpers/paginationHelper.js";

export interface GetUsersQuery {
  first_name?: string;
  mid_name?: string;
  last_name?: string;
  ssn?: string;
  user_type?: string;
  departments?: string;
  domains?: string;
  universities?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  status?: string;
  allow_profile_edit?: string;
  page_index?: number;
  page_size?: number;
}

export const parseGetUsersQuery = (q: any): GetUsersQuery => {
  return {
    first_name: normalize(q.first_name),
    mid_name: normalize(q.mid_name),
    last_name: normalize(q.last_name),
    ssn: normalize(q.ssn),
    user_type: normalize(q.user_type),
    departments: normalize(q.departments),
    domains: normalize(q.domains),
    universities: normalize(q.universities),
    email: normalize(q.email),
    phone: normalize(q.phone),
    mobile: normalize(q.mobile),
    job_title: normalize(q.job_title),
    status: normalize(q.status),
    allow_profile_edit: normalize(q.allow_profile_edit),
    page_index: parsePageIndex(q.page_index),
    page_size: parsePageSize(q.page_size),
  };
};

const normalize = (v: any) => {
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
};
