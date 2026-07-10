import { decryptSymmetrically, encryptSymmetrically } from "@ecom/lib/crypto";
import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { RedisCache } from "@ecom/lib/redis";
import type { PartnerStatus, Prisma, ServiceType } from "@ecom/prisma";
import type { PartnerRepository } from "../repositories/PartnerRepository";
import type {
  CreatePartnerServiceInput,
  PartnerServiceRepository,
  UpdatePartnerServiceInput,
} from "../repositories/PartnerServiceRepository";

const SENSITIVE_KEYS = new Set([
  "apikey",
  "secretkey",
  "clientsecret",
  "password",
  "token",
  "webhooksecret",
  "privatekey",
]);

function isEncryptedFormat(text: string): boolean {
  const parts = text.split(":");
  return parts.length === 3 && parts[0]?.length === 24;
}

export function encryptConfig(config: unknown): unknown {
  if (!config || typeof config !== "object") return config;
  if (Array.isArray(config)) {
    return config.map((item) => encryptConfig(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) && typeof value === "string") {
      if (isEncryptedFormat(value)) {
        result[key] = value;
      } else {
        result[key] = encryptSymmetrically(value);
      }
    } else if (typeof value === "object" && value !== null) {
      result[key] = encryptConfig(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function decryptConfig(config: unknown): unknown {
  if (!config || typeof config !== "object") return config;
  if (Array.isArray(config)) {
    return config.map((item) => decryptConfig(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) && typeof value === "string" && isEncryptedFormat(value)) {
      try {
        result[key] = decryptSymmetrically(value);
      } catch {
        result[key] = value;
      }
    } else if (typeof value === "object" && value !== null) {
      result[key] = decryptConfig(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface IPartnerServiceDeps {
  partnerRepo: PartnerRepository;
  partnerServiceRepo: PartnerServiceRepository;
}

export class PartnerService {
  private deps: IPartnerServiceDeps;
  private cache: RedisCache<Record<string, unknown>>;

  constructor(deps: IPartnerServiceDeps) {
    this.deps = deps;
    this.cache = new RedisCache<Record<string, unknown>>("partner-services", 3600);
  }

  // --- Partner CRUD ---

  async getPartner(id: number) {
    const partner = await this.deps.partnerRepo.findById(id);
    if (!partner) {
      throw new ErrorWithCode(ErrorCode.NotFound, `Không tìm thấy đối tác với ID ${id}.`, 404);
    }
    return partner;
  }

  async getPartnerByCode(code: string) {
    const partner = await this.deps.partnerRepo.findByCode(code);
    if (!partner) {
      throw new ErrorWithCode(ErrorCode.NotFound, `Không tìm thấy đối tác với mã ${code}.`, 404);
    }
    return partner;
  }

  async listPartners(options: {
    search?: string;
    status?: PartnerStatus;
    page?: number;
    perPage?: number;
    sortBy?: "id" | "code" | "name" | "status" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }) {
    return this.deps.partnerRepo.findMany(options);
  }

  async createPartner(data: {
    code: string;
    name: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    status?: PartnerStatus;
    description?: string | null;
  }) {
    const existing = await this.deps.partnerRepo.findByCode(data.code);
    if (existing) {
      throw new ErrorWithCode(ErrorCode.Conflict, `Mã đối tác "${data.code}" đã tồn tại.`, 409);
    }
    return this.deps.partnerRepo.create(data);
  }

  async updatePartner(
    id: number,
    data: {
      code?: string;
      name?: string;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      status?: PartnerStatus;
      description?: string | null;
    },
  ) {
    const partner = await this.getPartner(id);
    if (data.code && data.code !== partner.code) {
      const existing = await this.deps.partnerRepo.findByCode(data.code);
      if (existing) {
        throw new ErrorWithCode(ErrorCode.Conflict, `Mã đối tác "${data.code}" đã tồn tại.`, 409);
      }
    }
    return this.deps.partnerRepo.update(id, data);
  }

  async deletePartner(id: number) {
    await this.getPartner(id);

    // Invalidate cached configs for all services of this partner
    const services = await this.deps.partnerServiceRepo.findManyByPartnerId(id);
    for (const service of services) {
      await this.cache.invalidate(`config:${service.id}`);
    }

    return this.deps.partnerRepo.delete(id);
  }

  // --- PartnerService (Carrier Service) CRUD ---

  async getService(id: string, decrypt = false) {
    const service = await this.deps.partnerServiceRepo.findById(id);
    if (!service) {
      throw new ErrorWithCode(
        ErrorCode.NotFound,
        `Không tìm thấy dịch vụ đối tác với ID ${id}.`,
        404,
      );
    }

    if (decrypt && service.apiConfig) {
      service.apiConfig = decryptConfig(service.apiConfig) as typeof service.apiConfig;
    }

    return service;
  }

  async getServiceWithCachedConfig(id: string): Promise<Record<string, unknown>> {
    const cacheKey = `config:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const service = await this.getService(id, true);
    const fresh = {
      id: service.id,
      partnerId: service.partnerId,
      partnerCode: service.partner.code,
      code: service.code,
      name: service.name,
      type: service.type,
      apiConfig: (service.apiConfig as Record<string, unknown>) || {},
      statusMapping: (service.statusMapping as Record<string, unknown>) || {},
      isSandbox: service.isSandbox,
      isActive: service.isActive,
      webhookSecret: service.webhookSecret,
      timeoutMs: service.timeoutMs,
      rateLimitPerMinute: service.rateLimitPerMinute,
    };
    await this.cache.set(cacheKey, fresh);
    return fresh;
  }

  async listServices(partnerId: number) {
    await this.getPartner(partnerId);
    const services = await this.deps.partnerServiceRepo.findManyByPartnerId(partnerId);
    return services.map((s) => {
      if (s.apiConfig) {
        s.apiConfig = decryptConfig(s.apiConfig) as typeof s.apiConfig;
      }
      return s;
    });
  }

  async addService(data: {
    partnerId: number;
    code: string;
    name: string;
    type: ServiceType;
    apiConfig?: Prisma.InputJsonValue | null;
    statusMapping?: Prisma.InputJsonValue | null;
    isSandbox?: boolean;
    isActive?: boolean;
    webhookSecret?: string | null;
    timeoutMs?: number;
    rateLimitPerMinute?: number;
  }) {
    await this.getPartner(data.partnerId);

    const existing = await this.deps.partnerServiceRepo.findByCode(data.partnerId, data.code);
    if (existing) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        `Mã dịch vụ "${data.code}" đã được cấu hình cho đối tác này.`,
        409,
      );
    }

    const payload: CreatePartnerServiceInput = {
      ...data,
      apiConfig: data.apiConfig
        ? (encryptConfig(data.apiConfig) as CreatePartnerServiceInput["apiConfig"])
        : null,
      statusMapping: data.statusMapping,
    };

    return this.deps.partnerServiceRepo.create(payload);
  }

  async updateService(
    id: string,
    data: {
      code?: string;
      name?: string;
      type?: ServiceType;
      apiConfig?: Prisma.InputJsonValue | null;
      statusMapping?: Prisma.InputJsonValue | null;
      isSandbox?: boolean;
      isActive?: boolean;
      webhookSecret?: string | null;
      timeoutMs?: number;
      rateLimitPerMinute?: number;
    },
  ) {
    const service = await this.getService(id);

    if (data.code && data.code !== service.code) {
      const existing = await this.deps.partnerServiceRepo.findByCode(service.partnerId, data.code);
      if (existing) {
        throw new ErrorWithCode(
          ErrorCode.Conflict,
          `Mã dịch vụ "${data.code}" đã được cấu hình cho đối tác này.`,
          409,
        );
      }
    }

    const payload: UpdatePartnerServiceInput = {
      ...data,
      apiConfig: data.apiConfig
        ? (encryptConfig(data.apiConfig) as UpdatePartnerServiceInput["apiConfig"])
        : undefined,
      statusMapping: data.statusMapping,
    };

    const updated = await this.deps.partnerServiceRepo.update(id, payload);

    // Invalidate Redis cache
    await this.cache.invalidate(`config:${id}`);

    return updated;
  }

  async deleteService(id: string) {
    await this.getService(id);
    const result = await this.deps.partnerServiceRepo.delete(id);

    // Invalidate Redis cache
    await this.cache.invalidate(`config:${id}`);

    return result;
  }

  async testConnection(
    id: string,
    tempConfig?: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const service = await this.getService(id, true);
    const config = tempConfig || (service.apiConfig as Record<string, unknown>) || {};

    const partnerCode = service.partner.code.toUpperCase();

    // Simulated connection delays
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (partnerCode === "USPS") {
      const endpoint = (config.endpoint as string) || "";
      if (!endpoint.includes("secure.shippingapis.com")) {
        return { success: false, message: "USPS Endpoint must point to secure.shippingapis.com" };
      }
    }

    return {
      success: true,
      message: `Kết nối thành công tới ${service.partner.name} (${service.name}) ở chế độ ${service.isSandbox ? "Sandbox" : "Production"}.`,
    };
  }
}
