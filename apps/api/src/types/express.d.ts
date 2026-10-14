// Request id is attached by src/common/request-id/request-id.middleware.ts.
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
export {};
