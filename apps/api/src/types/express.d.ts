// Request id is attached by src/common/request-id/request-id.middleware.ts.
// `user` is attached by src/common/auth/jwt-auth.guard.ts after a valid bearer token.
import type { AuthenticatedUser } from '../common/auth/authenticated-user.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthenticatedUser;
    }
  }
}
export {};
