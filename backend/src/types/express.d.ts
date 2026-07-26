/**
 * Express type augmentation for custom properties
 */

import { Portal } from '../middleware/portalIsolationMiddleware';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: 'user' | 'owner' | 'admin' | 'super_admin';
        portal?: string;
        sessionId?: string;
      };
      portal?: Portal;
      session?: {
        id?: string;
        fingerprint?: {
          userAgent: string;
          ip: string;
        };
        destroy: (callback: (err: any) => void) => void;
      };
    }
  }
}

export {};
