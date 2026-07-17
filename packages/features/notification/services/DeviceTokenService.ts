import type { DeviceTokenRepository } from "../repositories/DeviceTokenRepository";

interface IDeviceTokenServiceDeps {
  deviceTokenRepo: DeviceTokenRepository;
  config?: {
    maxTokensPerOwner?: number;
  };
}

export class DeviceTokenService {
  private deps: IDeviceTokenServiceDeps;

  constructor(deps: IDeviceTokenServiceDeps) {
    this.deps = deps;
  }

  async registerToken(data: {
    userId?: string | null;
    customerId?: string | null;
    token: string;
    platform: string;
    deviceInfo?: string | null;
  }) {
    if (!data.token) {
      throw new Error("Device token is required");
    }
    const maxTokens = this.deps.config?.maxTokensPerOwner ?? 10;
    return this.deps.deviceTokenRepo.upsertToken(data, maxTokens);
  }

  async unregisterToken(token: string) {
    if (!token) {
      throw new Error("Device token is required");
    }
    return this.deps.deviceTokenRepo.deleteToken(token);
  }

  async getTokensByOwner(params: { userId?: string; customerId?: string }) {
    return this.deps.deviceTokenRepo.findByOwner(params);
  }

  async deleteInvalidTokens(tokens: string[]) {
    if (tokens.length === 0) return;
    return this.deps.deviceTokenRepo.deleteMany(tokens);
  }

  async purgeAbandonedTokens(daysThreshold: number) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    return this.deps.deviceTokenRepo.deleteInactiveSince(thresholdDate);
  }
}
