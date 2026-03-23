import { Request } from 'express';

export const auditStep = (req: Request, action: string) => {
  if (!req.audit) return;

  req.audit.steps.push({
    time: new Date(),
    action,
  });
};

export const setAuditResource = (req: Request, type: string, id: string) => {
  if (!req.audit) return;

  req.audit.resource = { type, id };
};

export const setAuditSummary = (
  req: Request,
  summary: string,
  action: string,
) => {
  if (!req.audit) return;

  req.audit.summary = summary;
  req.audit.action = action;
};

export const setAuditMetadata = (
  req: Request,
  metadata: Record<string, any>,
) => {
  if (!req.audit) return;

  req.audit.metadata = metadata;
};
