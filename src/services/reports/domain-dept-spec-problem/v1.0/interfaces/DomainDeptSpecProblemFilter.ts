export interface DomainDeptSpecProblemFilter {
  startDate?: string;
  endDate?: string;
  groupedFilters?: {
    domain?: string[];
    department?: string[];
    specialization?: string[];
    problem?: string[];
  };
}
