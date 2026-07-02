import {
  MAX_USERNAME_GENERATION_ATTEMPTS,
  USERNAME_REGEX,
} from "@ecom/features/customer/constants";
import { ErrorWithCode } from "@ecom/lib/errors";
import type { CustomerStatus, Prisma, PrismaClient } from "@ecom/prisma";

export interface CustomerFilters {
  status?: CustomerStatus;
  search?: string;
}

export class CustomerRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(filters: CustomerFilters, page = 1, perPage = 50) {
    const where = this.buildWhere(filters);
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          phone: true,
          avatarUrl: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { activityLogs: true, socialAccounts: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: number) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        usernameChangeCount: true,
        usernameChangedAt: true,
        name: true,
        phone: true,
        avatarUrl: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        dob: true,
        gender: true,
        description: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        socialAccounts: {
          select: { id: true, provider: true, email: true, name: true, createdAt: true },
        },
        activityLogs: {
          select: { id: true, action: true, ipAddress: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.customer.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.customer.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
      },
    });
  }

  async findByEmailOrUsername(identifier: string) {
    const isEmail = identifier.includes("@");
    if (isEmail) {
      return this.findByEmailWithPassword(identifier);
    }
    return this.findByUsernameWithPassword(identifier.toLowerCase());
  }

  async isUsernameAvailable(username: string) {
    if (!USERNAME_REGEX.test(username)) return false;
    const existing = await this.prisma.customer.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: { id: true },
    });
    return !existing;
  }

  async generateUniqueUsername(email: string): Promise<string> {
    let prefix = email.split("@")[0] ?? "user";
    prefix = prefix.split("+")[0] ?? prefix;
    prefix = prefix.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    if (prefix.length < 3) {
      prefix = `${prefix}_user`;
    }
    if (prefix.length > 30) {
      prefix = prefix.slice(0, 30);
    }

    let candidate = prefix;
    let counter = 0;
    while (counter <= MAX_USERNAME_GENERATION_ATTEMPTS) {
      const existing = await this.prisma.customer.findFirst({
        where: { username: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return candidate;
      counter++;
      candidate = `${prefix}${counter}`;
      if (candidate.length > 30) {
        candidate = `${prefix.slice(0, 30 - String(counter).length)}${counter}`;
      }
    }
    throw ErrorWithCode.Factory.Internal(
      "Unable to generate unique username after maximum attempts",
    );
  }

  async create(data: {
    email: string;
    username: string;
    name?: string;
    phone?: string;
    dob?: Date;
    gender?: string;
    description?: string;
    hashedPassword?: string;
  }) {
    return this.prisma.customer.create({
      data: {
        ...data,
        username: data.username.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      username?: string;
      usernameChangeCount?: number;
      usernameChangedAt?: Date;
      name?: string;
      phone?: string;
      avatarUrl?: string;
      dob?: Date | null;
      gender?: string | null;
      description?: string | null;
      status?: CustomerStatus;
    },
  ) {
    const updateData = { ...data };
    if (updateData.username) {
      updateData.username = updateData.username.toLowerCase();
    }
    return this.prisma.customer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async restore(id: number) {
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true },
    });
  }

  async hardDelete(id: number) {
    return this.prisma.customer.delete({ where: { id } });
  }

  async getStats() {
    const [total, active, inactive, banned] = await Promise.all([
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.customer.count({ where: { status: "ACTIVE", deletedAt: null } }),
      this.prisma.customer.count({ where: { status: "INACTIVE", deletedAt: null } }),
      this.prisma.customer.count({ where: { status: "BANNED", deletedAt: null } }),
    ]);
    return { total, active, inactive, banned };
  }

  // ─── Auth-related methods ──────────────────────────

  async findByEmailWithPassword(email: string) {
    return this.prisma.customer.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        hashedPassword: true,
        status: true,
      },
    });
  }

  async findByUsernameWithPassword(username: string) {
    return this.prisma.customer.findFirst({
      where: { username, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        hashedPassword: true,
        status: true,
      },
    });
  }

  async findByIdWithPassword(id: number) {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        hashedPassword: true,
        username: true,
        usernameChangeCount: true,
        status: true,
      },
    });
  }

  async createWithPassword(data: {
    email: string;
    username: string;
    name?: string;
    hashedPassword: string;
  }) {
    return this.prisma.customer.create({
      data: {
        ...data,
        username: data.username.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });
  }

  async updatePassword(id: number, hashedPassword: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { hashedPassword },
      select: { id: true },
    });
  }

  async updateLastLogin(id: number) {
    return this.prisma.customer.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });
  }

  async verifyEmail(id: number) {
    return this.prisma.customer.update({
      where: { id },
      data: { emailVerified: new Date() },
      select: { id: true, emailVerified: true },
    });
  }

  async deleteSessions(customerId: number, excludeSessionToken?: string): Promise<void> {
    await this.prisma.customerSession.deleteMany({
      where: {
        customerId,
        ...(excludeSessionToken ? { sessionToken: { not: excludeSessionToken } } : {}),
      },
    });
  }

  async invalidatePreviousVerificationCodes(email: string): Promise<void> {
    await this.prisma.customerVerificationCode.updateMany({
      where: { email, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  }

  async createVerificationCode(email: string, code: string, expiresAt: Date) {
    return this.prisma.customerVerificationCode.create({
      data: {
        email,
        code,
        status: "PENDING",
        expiresAt,
      },
    });
  }

  async findLatestPendingVerificationCode(email: string) {
    return this.prisma.customerVerificationCode.findFirst({
      where: { email, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  }

  async markVerificationCodeVerified(id: number): Promise<void> {
    await this.prisma.customerVerificationCode.update({
      where: { id },
      data: { status: "VERIFIED" },
    });
  }

  async markVerificationCodeExpired(id: number): Promise<void> {
    await this.prisma.customerVerificationCode.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
  }

  async incrementVerificationCodeAttempts(id: number): Promise<number> {
    const updated = await this.prisma.customerVerificationCode.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
      select: {
        attempts: true,
      },
    });
    return updated.attempts;
  }

  async findVerificationCodes(search?: string, page = 1, perPage = 25) {
    const where: Prisma.CustomerVerificationCodeWhereInput = {};
    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }
    const [items, total] = await Promise.all([
      this.prisma.customerVerificationCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.customerVerificationCode.count({ where }),
    ]);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  private buildWhere(filters: CustomerFilters) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { username: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ];
    }
    return where;
  }
}
