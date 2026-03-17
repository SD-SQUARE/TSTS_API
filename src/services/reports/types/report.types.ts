export interface ReportMetadata {
  title: string;
  subtitle?: Array<{
    text: string;
    fontSize?: number;
    color?: string;
  }>;
  generatedBy: string;
  generatedAt: Date;
  pageNumber?: number;
  totalPages?: number;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: string | number;
  alignment?: "left" | "center" | "right";
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
  isRTL?: boolean; // Flag to indicate RTL layout
}

export interface ReportTableConfig {
  rowsPerPage: number;
  indexColumnHeader?: string;
  indexColumnWidth?: number;
  indexStartOffset?: number;
  showIndex?: boolean; // Whether to show index column
}

export interface BaseReportConfig {
  metadata: ReportMetadata;
  uniLogo?: string;
  citiLogo?: string;
  footerText?: string;
  translations?: Record<string, any>;
  tableConfig?: ReportTableConfig;
}

export interface IReportGenerator {
  generate(data: any): Promise<Buffer>;
  generateStream(data: any, res: any): Promise<void>;
}

export enum ReportTypes {
  PDF = "pdf",
  EXCEL = "excel",
}

export enum PeriodType {
  DAY = "day",
  MONTH = "month",
  YEAR = "year",
}
