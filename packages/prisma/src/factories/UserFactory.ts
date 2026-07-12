import crypto from "node:crypto";
import type { Prisma, User } from "../generated/prisma/client";
import { prisma } from "../index";

export class UserFactory {
  private overrides: Partial<Prisma.UserCreateInput> = {};

  static new(): UserFactory {
    return new UserFactory();
  }

  active(): this {
    this.overrides.status = "ACTIVE";
    return this;
  }

  suspended(): this {
    this.overrides.status = "SUSPENDED";
    return this;
  }

  withName(name: string): this {
    this.overrides.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.overrides.email = email;
    return this;
  }

  build(overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput {
    return UserFactory.build({ ...this.overrides, ...overrides });
  }

  async create(overrides: Partial<Prisma.UserCreateInput> = {}): Promise<User> {
    return prisma.user.create({
      data: UserFactory.build({ ...this.overrides, ...overrides }),
    });
  }

  static build(overrides: Partial<Prisma.UserCreateInput> = {}): Prisma.UserCreateInput {
    const randomId = Math.random().toString(36).substring(7);
    const { password, roles, ...rest } = overrides;

    return {
      id: rest.id ?? crypto.randomUUID(),
      email: rest.email ?? `user-${randomId}@ecom.com`,
      name: rest.name ?? `Test User ${randomId}`,
      status: rest.status ?? "ACTIVE",
      password: password ?? {
        create: {
          hash: "mocked-bcrypt-hash",
        },
      },
      ...rest,
    };
  }

  static async create(overrides: Partial<Prisma.UserCreateInput> = {}): Promise<User> {
    return prisma.user.create({
      data: UserFactory.build(overrides),
    });
  }
}
