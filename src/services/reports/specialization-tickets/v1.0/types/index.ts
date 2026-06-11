export interface ReportFilter {
  column: string;
  value: string | string[];
}

export interface SpecializationTicketsFilter {
  startDate?: string | null;
  endDate?: string | null;
  filters?: ReportFilter[]; // Generic equality filters (raw array format)
  groupedFilters?: Record<string, string[]>; // Grouped filters by column
}

export interface SpecializationTicketDataWithMeta {
  id: string;
  specialization: string;
  ticketsCount: number;
  createdAt?: Date;
}

export interface PaginatedSpecializationTicketData {
  results: SpecializationTicketDataWithMeta[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface SpecializationTicketData {
  specialization: string;
  ticketsCount: number;
}

export interface SpecializationTicketsReportData {
  data: SpecializationTicketData[];
  filterMetadata?: FilterMetadata;
}

export interface FilterMetadata {
  totalRecords: number;
  filteredRecords: number;
  filters: {
    startDate?: string;
    endDate?: string;
    filters?: ReportFilter[];
  };
  translations?: Record<string, any>;
}
