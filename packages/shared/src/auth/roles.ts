/** Mirrors the Prisma `UserRole` enum; the schema and the enum are kept in sync by the auth e2e test. */
export const USER_ROLES = ['TALENT', 'CLIENT', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles a user may pick at sign-up. ADMIN is granted by hand in the database (ADR 0018). */
export const SIGNUP_ROLES = ['TALENT', 'CLIENT'] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];
