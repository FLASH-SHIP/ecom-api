import type { PrismaClient } from "@ecom/prisma";

export class UserRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        locale: true,
        status: true,
        emailVerified: true,
        password: {
          select: { hash: true },
        },
      },
    });
  }

  /** Lightweight lookup by username — only id returned, used for uniqueness checks. */
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        username: true,
        locale: true,
        status: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async findByIdWithRoles(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        username: true,
        locale: true,
        status: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                permissions: {
                  select: {
                    permission: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Fetch password hash for self-password-change verification */
  async findByIdWithPassword(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        password: { select: { hash: true } },
      },
    });
  }

  async updateProfile(
    id: string,
    data: {
      name?: string;
      username?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      locale?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        username: true,
        locale: true,
        avatarUrl: true,
      },
    });
  }

  async updatePassword(id: string, hash: string) {
    return this.prisma.userPassword.upsert({
      where: { userId: id },
      create: { userId: id, hash },
      update: { hash },
    });
  }

  /** Get a single user_meta value by key (returns null if not found) */
  async getMeta(userId: string, key: string): Promise<string | null> {
    const meta = await this.prisma.userMeta.findUnique({
      where: { userId_key: { userId, key } },
      select: { value: true },
    });
    return meta?.value ?? null;
  }

  /** Upsert a user_meta key-value pair */
  async setMeta(userId: string, key: string, value: string): Promise<void> {
    await this.prisma.userMeta.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
  }
}
