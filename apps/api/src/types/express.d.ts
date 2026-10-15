// Request id is attached by src/common/request-id/request-id.middleware.ts.
// `user` is attached by src/common/auth/jwt-auth.guard.ts after a valid bearer token.
// `@types/passport` already declares `Request.user?: Express.User`, so the shape of the signed-in user
// is added to `Express.User` here instead of redeclaring `user` (a second declaration would conflict).
import type { AuthenticatedUser } from '../common/auth/authenticated-user.js';
import type { GoogleProfile } from '../modules/auth/google-profile.js';

declare global {
  namespace Express {
    interface User {
      id: AuthenticatedUser['id'];
      roles: AuthenticatedUser['roles'];
    }
    interface Request {
      id: string;
      /** Set by the Google callback guard only; `null` when Google refused or the user cancelled. */
      oauthProfile?: GoogleProfile | null;
    }
  }
}
export {};
