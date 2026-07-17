import type { DeviceToken, Prisma } from "../generated/prisma/client";
import { prisma } from "../index";

export class DeviceTokenFactory {
  private overrides: Partial<Prisma.DeviceTokenUncheckedCreateInput> = {};

  static new(): DeviceTokenFactory {
    return new DeviceTokenFactory();
  }

  forUser(userId: string): this {
    this.overrides.userId = userId;
    this.overrides.customerId = null;
    return this;
  }

  forCustomer(customerId: string): this {
    this.overrides.customerId = customerId;
    this.overrides.userId = null;
    return this;
  }

  ios(): this {
    this.overrides.platform = "ios";
    return this;
  }

  android(): this {
    this.overrides.platform = "android";
    return this;
  }

  web(): this {
    this.overrides.platform = "web";
    return this;
  }

  build(
    overrides: Partial<Prisma.DeviceTokenUncheckedCreateInput> = {},
  ): Prisma.DeviceTokenUncheckedCreateInput {
    return DeviceTokenFactory.build({ ...this.overrides, ...overrides });
  }

  async create(
    overrides: Partial<Prisma.DeviceTokenUncheckedCreateInput> = {},
  ): Promise<DeviceToken> {
    const data = this.build(overrides);
    return prisma.deviceToken.create({
      data: data as Prisma.DeviceTokenUncheckedCreateInput,
    });
  }

  static build(
    overrides: Partial<Prisma.DeviceTokenUncheckedCreateInput> = {},
  ): Prisma.DeviceTokenUncheckedCreateInput {
    const randomId = Math.random().toString(36).substring(7);
    return {
      token: overrides.token ?? `fcm-token-${randomId}`,
      platform: overrides.platform ?? "web",
      deviceInfo: overrides.deviceInfo ?? "Chrome Browser on macOS",
      ...overrides,
    };
  }

  static async create(
    overrides: Partial<Prisma.DeviceTokenUncheckedCreateInput> = {},
  ): Promise<DeviceToken> {
    const data = DeviceTokenFactory.build(overrides);
    return prisma.deviceToken.create({
      data: data as Prisma.DeviceTokenUncheckedCreateInput,
    });
  }
}
