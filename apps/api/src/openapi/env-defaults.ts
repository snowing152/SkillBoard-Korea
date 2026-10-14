// Imported first by generate.ts: env validation runs when app.module.js is loaded, and ES imports are
// hoisted, so these defaults must live in their own module to run before AppModule is required.
// The app is created but never listens; Prisma connects lazily and the JWT secret never signs anything.
process.env.DATABASE_URL ??= 'postgresql://openapi:openapi@localhost:5432/openapi';
process.env.JWT_ACCESS_SECRET ??= 'openapi-generation-only-secret-never-signs-anything';
