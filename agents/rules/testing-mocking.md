---
title: Mock Services and Integrations in Tests
impact: MEDIUM
tags: testing, mocking, di
---

## Mocking with DI

DI makes mocking easy. Replace real dependencies with mocks in tests:

```typescript
const mockPostRepo = {
  findById: vi.fn().mockResolvedValue({ id: 1, title: "Test" }),
  updateStatus: vi.fn().mockResolvedValue({ id: 1, status: "PUBLISHED" }),
};

const postService = new PostService({
  postRepo: mockPostRepo,
  emailService: mockEmailService,
});
```

Never mock Prisma client directly in service tests — mock the repository instead.
