import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase.js';
import { ApiError } from '../lib/errors.js';

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email?: string;
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    if (!token) {
      throw new ApiError(401, 'auth_required', 'A valid Firebase ID token is required.');
    }

    const decoded = await adminAuth.verifyIdToken(token);
    (req as AuthenticatedRequest).user = decoded.email
      ? { uid: decoded.uid, email: decoded.email }
      : { uid: decoded.uid };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(new ApiError(401, 'invalid_token', 'The provided authentication token is invalid or expired.'));
  }
}
