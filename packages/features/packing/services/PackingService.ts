import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import type { ContentStatus } from "@ecom/prisma";
import type { PackingRepository } from "../repositories/PackingRepository";

export interface IPackingServiceDeps {
  packingRepo: PackingRepository;
}

export class PackingService {
  private deps: IPackingServiceDeps;

  constructor(deps: IPackingServiceDeps) {
    this.deps = deps;
  }

  async getPackingType(id: number) {
    const packingType = await this.deps.packingRepo.findById(id);
    if (!packingType) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Packing type not found", 404);
    }
    return packingType;
  }

  async listPackingTypes(params: {
    search?: string;
    status?: ContentStatus;
    page?: number;
    limit?: number;
    orderBy?: "asc" | "desc";
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const { items, total } = await this.deps.packingRepo.list({
      search: params.search,
      status: params.status,
      skip,
      take: limit,
      orderBy: params.orderBy,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createPackingType(data: {
    name: string;
    image?: string | null;
    description?: string | null;
    status?: ContentStatus;
  }) {
    if (!data.name || data.name.trim() === "") {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Name is required", 422);
    }

    const existing = await this.deps.packingRepo.findByName(data.name.trim());
    if (existing) {
      throw new ErrorWithCode(ErrorCode.Conflict, `Packing type with name "${data.name}" already exists`, 409);
    }

    return this.deps.packingRepo.create({
      ...data,
      name: data.name.trim(),
    });
  }

  async updatePackingType(
    id: number,
    data: {
      name?: string;
      image?: string | null;
      description?: string | null;
      status?: ContentStatus;
    }
  ) {
    // Check existence first
    await this.getPackingType(id);

    if (data.name !== undefined) {
      if (!data.name || data.name.trim() === "") {
        throw new ErrorWithCode(ErrorCode.ValidationError, "Name cannot be empty", 422);
      }

      const existing = await this.deps.packingRepo.findByName(data.name.trim());
      if (existing && existing.id !== id) {
        throw new ErrorWithCode(ErrorCode.Conflict, `Packing type with name "${data.name}" already exists`, 409);
      }
    }

    const updateData: any = { ...data };
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    return this.deps.packingRepo.update(id, updateData);
  }

  async deletePackingType(id: number) {
    // Check existence
    await this.getPackingType(id);

    return this.deps.packingRepo.softDelete(id);
  }
}
