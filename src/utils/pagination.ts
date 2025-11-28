export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page_index: number;
  page_size: number;
}

export const buildPagination = (
  pagination: PaginationQuery
): { skip: number; take: number; meta: PaginationMeta } => {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const limit =
    pagination.limit && pagination.limit > 0 ? pagination.limit : 10;

  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    meta: {
      total: 0, // set later
      page_index: page,
      page_size: limit,
    },
  };
};
