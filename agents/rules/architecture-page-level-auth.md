---
title: Auth in page.tsx, Not layout.tsx
impact: HIGH
tags: architecture, auth, nextjs
---

## Permission Checks in page.tsx, Not layout.tsx

**Impact: HIGH**

Put permission and auth checks in `page.tsx`, never in `layout.tsx`. Layout components are shared across multiple pages and should not contain page-specific authorization logic.

```typescript
// ✅ Good — page.tsx
export default async function UsersPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.user, "users.list")) redirect("/forbidden");
  return <UsersListView />;
}

// ❌ Bad — layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  // This blocks ALL child pages, not just the ones that need this check
  return <div>{children}</div>;
}
```
