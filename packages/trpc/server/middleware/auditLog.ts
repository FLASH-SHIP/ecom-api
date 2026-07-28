import { middleware } from "../init";

export function auditLog(_opts: { module: string; action: string; entityType: string }) {
  return middleware(async ({ next }) => {
    return next();
  });
}
