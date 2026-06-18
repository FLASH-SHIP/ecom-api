# Contributing to Ecom

## Development Workflow

### 1. Branch Naming

```
feat/short-description     # New feature
fix/short-description      # Bug fix
refactor/short-description # Code refactoring
docs/short-description     # Documentation only
```

### 2. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(blog): add post scheduling
fix(auth): handle expired refresh tokens
refactor(trpc): extract DI containers
docs(api): update Bruno collection
chore(deps): bump prisma to v6.2
```

### 3. Pull Requests

- Keep PRs **under 500 lines** and **under 10 files**
- Create PRs in **draft mode** by default
- Title follows conventional commits: `feat(scope): description`
- Fill in the PR template

#### How to Split Large Changes

| Strategy | Example |
|----------|---------|
| By layer | Schema PR → Service PR → UI PR |
| By feature part | API endpoint PR → UI component PR → Integration PR |
| Refactor vs feature | Refactoring PR → Feature PR |

### 4. Before Pushing

```bash
# Required
yarn type-check:ci --force    # Type check
yarn biome check --write .    # Lint + format

# Recommended
TZ=UTC yarn test              # Unit tests
yarn build                    # Full build
```

## Code Standards

### TypeScript

- Use `import type { X }` for type-only imports
- Use `select` (not `include`) in Prisma queries
- Use early returns: `if (!user) return null;`
- Never use `as any`
- Never expose sensitive fields (`password`, `hashedKey`, `tokenHash`)

### Architecture

```
Router → Procedure Handler → DI Container → Service → Repository
```

- **Routers**: Pure composition, no business logic
- **Services**: Business logic, uses ErrorWithCode for errors
- **Repositories**: Data access only, uses `select` in Prisma
- **DI Containers**: Lazy singletons, wire dependencies

### Error Handling

| Location | Error Type |
|----------|------------|
| Services / Repositories | `ErrorWithCode` |
| tRPC Routers | `TRPCError` |
| NestJS Controllers | `HttpException` subclasses |

### Translations

All UI strings must be added to both:
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/vi/common.json`

## Getting Help

- Check [AGENTS.md](AGENTS.md) for detailed coding rules
- Check [API docs](docs/api/README.md) for endpoint specs
- Ask in the team chat before making large speculative changes
