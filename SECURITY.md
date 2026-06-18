# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

**Email:** security@ecom.com

**Do:**
- Email your findings with clear reproduction steps
- Allow reasonable time for a fix before public disclosure
- Avoid accessing or modifying other users' data

**Don't:**
- Run automated scanners against production
- Exploit vulnerabilities beyond what's needed to demonstrate them
- Share vulnerability details publicly before they're fixed

## Response Timeline

- **Acknowledgment:** Within 2 business days
- **Initial assessment:** Within 5 business days
- **Fix timeline:** Depends on severity, typically 7–30 days

## Security Practices

### Authentication
- Passwords are hashed with **bcrypt** (cost factor 10)
- JWT tokens are short-lived (15-minute access, 30-day refresh)
- API keys are stored as **SHA-256 hashes** — raw keys are never persisted
- Sessions use **httpOnly, secure cookies**

### Data Protection
- All Prisma queries use `select` — never `include` — to prevent accidental exposure
- Sensitive fields (`password`, `hashedKey`, `tokenHash`, `refreshTokenHash`) are never returned in API responses
- Input validation via **Zod** (tRPC) and **class-validator** (NestJS)

### Infrastructure
- CORS restricted to configured origins
- API rate limiting (planned)
- All secrets stored in environment variables, never committed
