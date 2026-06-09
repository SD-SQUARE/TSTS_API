import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      permission_profile?: object;
      permissions?: string[];
      name?: any;
    };
    apiKey?: {
      id: string;
      name: string;
      keyPrefix: string;
      zones: string[];
      methods: string[];
      activeZone: string;
    };
    file?: Express.Multer.File;
    audit?: {
      steps: { time: Date; action: string }[];
      summary?: string;
      action?: string;
      resource?: { type: string; id: string };
      metadata?: Record<string, any>;
    };
  }
}
