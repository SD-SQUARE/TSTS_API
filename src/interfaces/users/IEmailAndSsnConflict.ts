export type EmailSsnConflictStatus = "both" | "email" | "ssn" | "none";
export interface EmailSsnConflictResult {
  status: EmailSsnConflictStatus;
  email: boolean;
  ssn: boolean;
}
