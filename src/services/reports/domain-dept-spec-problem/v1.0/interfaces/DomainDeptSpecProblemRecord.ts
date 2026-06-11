export interface DomainDeptSpecProblemRecord {
  domainId: string;
  domain: string;
  departmentId: string;
  department: string;
  specializationId: string | null;
  specialization: string | null;
  problemId: string | null;
  problem: string | null;
  ticketCount: number;
}
