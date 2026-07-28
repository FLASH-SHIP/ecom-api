import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import type { AdministrativeDivisionRepository } from "../repositories/AdministrativeDivisionRepository";
import type { ProvinceRepository } from "../repositories/ProvinceRepository";
import type { WardRepository } from "../repositories/WardRepository";

export interface IAdministrativeServiceDeps {
  provinceRepo: ProvinceRepository;
  wardRepo: WardRepository;
  divisionRepo: AdministrativeDivisionRepository;
}

export class AdministrativeService {
  private deps: IAdministrativeServiceDeps;

  constructor(deps: IAdministrativeServiceDeps) {
    this.deps = deps;
  }

  // --- PROVINCES CRUD ---

  async getProvince(id: number) {
    const province = await this.deps.provinceRepo.findById(id);
    if (!province) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Province not found", 404);
    }
    return province;
  }

  async getProvinceByCode(code: number) {
    const province = await this.deps.provinceRepo.findByCode(code);
    if (!province) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Province not found", 404);
    }
    return province;
  }

  async listProvinces(params: {
    search?: string;
    divisionType?: string;
    page?: number;
    limit?: number;
    orderBy?: "asc" | "desc";
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const { items, total } = await this.deps.provinceRepo.list({
      search: params.search,
      divisionType: params.divisionType,
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

  async createProvince(data: {
    name: string;
    code: number;
    divisionType: string;
    codeName: string;
    phoneCode: number;
  }) {
    if (!data.name || data.name.trim() === "") {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Name is required", 422);
    }
    if (!data.code || data.code <= 0) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Code must be positive", 422);
    }

    // Check code uniqueness
    const existingCode = await this.deps.provinceRepo.findByCode(data.code);
    if (existingCode) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        `Province with code ${data.code} already exists`,
        409,
      );
    }

    // Check name uniqueness
    const existingName = await this.deps.provinceRepo.findByName(data.name.trim());
    if (existingName) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        `Province with name "${data.name}" already exists`,
        409,
      );
    }

    return this.deps.provinceRepo.create({
      ...data,
      name: data.name.trim(),
      codeName: data.codeName.trim() || data.name.trim().toLowerCase().replace(/\s+/g, "_"),
    });
  }

  private async validateProvinceUpdate(
    id: number,
    data: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      phoneCode?: number;
    },
  ) {
    if (data.code !== undefined) {
      if (data.code <= 0) {
        throw new ErrorWithCode(ErrorCode.ValidationError, "Code must be positive", 422);
      }
      const existingCode = await this.deps.provinceRepo.findByCode(data.code);
      if (existingCode && existingCode.id !== id) {
        throw new ErrorWithCode(
          ErrorCode.Conflict,
          `Province with code ${data.code} already exists`,
          409,
        );
      }
    }

    if (data.name !== undefined) {
      if (!data.name || data.name.trim() === "") {
        throw new ErrorWithCode(ErrorCode.ValidationError, "Name cannot be empty", 422);
      }
      const existingName = await this.deps.provinceRepo.findByName(data.name.trim());
      if (existingName && existingName.id !== id) {
        throw new ErrorWithCode(
          ErrorCode.Conflict,
          `Province with name "${data.name}" already exists`,
          409,
        );
      }
    }
  }

  async updateProvince(
    id: number,
    data: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      phoneCode?: number;
    },
  ) {
    await this.getProvince(id);
    await this.validateProvinceUpdate(id, data);

    const updateData: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      phoneCode?: number;
    } = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code;
    if (data.divisionType !== undefined) updateData.divisionType = data.divisionType;
    if (data.codeName !== undefined) updateData.codeName = data.codeName.trim();
    if (data.phoneCode !== undefined) updateData.phoneCode = data.phoneCode;

    return this.deps.provinceRepo.update(id, updateData);
  }

  async deleteProvince(id: number) {
    await this.getProvince(id);
    return this.deps.provinceRepo.softDelete(id);
  }

  // --- WARDS CRUD ---

  async getWard(id: number) {
    const ward = await this.deps.wardRepo.findById(id);
    if (!ward) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Ward not found", 404);
    }
    return ward;
  }

  async listWards(params: {
    provinceCode?: number;
    search?: string;
    divisionType?: string;
    page?: number;
    limit?: number;
    orderBy?: "asc" | "desc";
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const { items, total } = await this.deps.wardRepo.list({
      provinceCode: params.provinceCode,
      search: params.search,
      divisionType: params.divisionType,
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

  async createWard(data: {
    name: string;
    code: number;
    divisionType: string;
    codeName: string;
    provinceCode: number;
  }) {
    if (!data.name || data.name.trim() === "") {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Name is required", 422);
    }
    if (!data.code || data.code <= 0) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Code must be positive", 422);
    }

    // Check code uniqueness
    const existingCode = await this.deps.wardRepo.findByCode(data.code);
    if (existingCode) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        `Ward with code ${data.code} already exists`,
        409,
      );
    }

    // Verify parent province exists
    const province = await this.deps.provinceRepo.findByCode(data.provinceCode);
    if (!province) {
      throw new ErrorWithCode(
        ErrorCode.NotFound,
        `Parent province with code ${data.provinceCode} not found`,
        404,
      );
    }

    return this.deps.wardRepo.create({
      ...data,
      name: data.name.trim(),
      codeName: data.codeName.trim() || data.name.trim().toLowerCase().replace(/\s+/g, "_"),
    });
  }

  private async validateWardUpdate(
    id: number,
    data: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      provinceCode?: number;
    },
  ) {
    if (data.code !== undefined) {
      if (data.code <= 0) {
        throw new ErrorWithCode(ErrorCode.ValidationError, "Code must be positive", 422);
      }
      const existingCode = await this.deps.wardRepo.findByCode(data.code);
      if (existingCode && existingCode.id !== id) {
        throw new ErrorWithCode(
          ErrorCode.Conflict,
          `Ward with code ${data.code} already exists`,
          409,
        );
      }
    }

    if (data.provinceCode !== undefined) {
      const province = await this.deps.provinceRepo.findByCode(data.provinceCode);
      if (!province) {
        throw new ErrorWithCode(
          ErrorCode.NotFound,
          `Parent province with code ${data.provinceCode} not found`,
          404,
        );
      }
    }

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Name cannot be empty", 422);
    }
  }

  async updateWard(
    id: number,
    data: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      provinceCode?: number;
    },
  ) {
    await this.getWard(id);
    await this.validateWardUpdate(id, data);

    const updateData: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      provinceCode?: number;
    } = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code;
    if (data.divisionType !== undefined) updateData.divisionType = data.divisionType;
    if (data.codeName !== undefined) updateData.codeName = data.codeName.trim();
    if (data.provinceCode !== undefined) updateData.provinceCode = data.provinceCode;

    return this.deps.wardRepo.update(id, updateData);
  }

  async deleteWard(id: number) {
    await this.getWard(id);
    return this.deps.wardRepo.softDelete(id);
  }

  // --- ADMINISTRATIVE DIVISIONS (Multi-country) ---

  async listDivisions(params: {
    countryCode: string;
    level?: number;
    parentId?: number;
    search?: string;
    page?: number;
    limit?: number;
    orderBy?: "asc" | "desc";
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const { items, total } = await this.deps.divisionRepo.list({
      countryCode: params.countryCode,
      level: params.level,
      parentId: params.parentId,
      search: params.search,
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

  async getDivision(id: number) {
    const division = await this.deps.divisionRepo.findById(id);
    if (!division) {
      throw new ErrorWithCode(ErrorCode.NotFound, "Division not found", 404);
    }
    return division;
  }

  async createDivision(data: {
    countryCode: string;
    code: string;
    name: string;
    nameEn?: string;
    divisionType: string;
    level: number;
    parentId?: number;
  }) {
    if (!data.name || data.name.trim() === "") {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Name is required", 422);
    }
    if (!data.code || data.code.trim() === "") {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Code is required", 422);
    }

    const existing = await this.deps.divisionRepo.findByCountryAndCode(data.countryCode, data.code);
    if (existing) {
      throw new ErrorWithCode(
        ErrorCode.Conflict,
        `Division with code "${data.code}" already exists for country ${data.countryCode}`,
        409,
      );
    }

    if (data.parentId) {
      const parent = await this.deps.divisionRepo.findById(data.parentId);
      if (!parent) {
        throw new ErrorWithCode(ErrorCode.NotFound, "Parent division not found", 404);
      }
    }

    return this.deps.divisionRepo.create({
      ...data,
      name: data.name.trim(),
    });
  }

  async updateDivision(
    id: number,
    data: {
      name?: string;
      nameEn?: string;
      divisionType?: string;
      isActive?: boolean;
    },
  ) {
    await this.getDivision(id);

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      throw new ErrorWithCode(ErrorCode.ValidationError, "Name cannot be empty", 422);
    }

    const updateData: {
      name?: string;
      nameEn?: string;
      divisionType?: string;
      isActive?: boolean;
    } = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn.trim();
    if (data.divisionType !== undefined) updateData.divisionType = data.divisionType;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.deps.divisionRepo.update(id, updateData);
  }
}
