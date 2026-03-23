export interface RequesterDomainFilter {
  startDate?: string;
  endDate?: string;
  groupedFilters?: {
    domain?: string[];
    user?: string[];
  };
}
