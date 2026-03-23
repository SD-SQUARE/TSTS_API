import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    audit?: {
      steps: { time: Date; action: string }[];
      summary?: string;
      action?: string;
      resource?: { type: string; id: string };
      metadata?: Record<string, any>;
    };
  }
}
