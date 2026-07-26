import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import type {
  CustomerGroupFilters,
  CustomerGroupRepository,
} from "../repositories/CustomerGroupRepository";

export interface ICustomerGroupServiceDeps {
  customerGroupRepo: CustomerGroupRepository;
}

export class CustomerGroupService {
  private deps: ICustomerGroupServiceDeps;

  constructor(deps: ICustomerGroupServiceDeps) {
    this.deps = deps;
  }

  async listCustomerGroups(filters: CustomerGroupFilters, page = 1, perPage = 50) {
    return this.deps.customerGroupRepo.findMany(filters, page, perPage);
  }

  async listAllCustomerGroups() {
    return this.deps.customerGroupRepo.findAll();
  }

  async getCustomerGroup(id: number) {
    const group = await this.deps.customerGroupRepo.findById(id);
    if (!group) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupNotFound,
        `Không tìm thấy nhóm khách hàng có ID ${id}.`,
        404,
      );
    }
    return group;
  }

  async createCustomerGroup(data: { code: string; name: string; description?: string | null }) {
    const existing = await this.deps.customerGroupRepo.findByCode(data.code);
    if (existing) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupConflict,
        `Mã nhóm khách hàng "${data.code}" đã tồn tại.`,
        409,
      );
    }
    return this.deps.customerGroupRepo.create(data);
  }

  async updateCustomerGroup(
    id: number,
    data: { code?: string; name?: string; description?: string | null },
  ) {
    const group = await this.deps.customerGroupRepo.findById(id);
    if (!group) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupNotFound,
        `Không tìm thấy nhóm khách hàng để cập nhật.`,
        404,
      );
    }

    if (group.code === "default") {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupConflict,
        "Không thể chỉnh sửa hoặc cập nhật nhóm khách hàng mặc định của hệ thống.",
        400,
      );
    }

    if (data.code && data.code.toLowerCase() !== group.code) {
      const existing = await this.deps.customerGroupRepo.findByCode(data.code);
      if (existing) {
        throw new ErrorWithCode(
          ErrorCode.CustomerGroupConflict,
          `Mã nhóm khách hàng "${data.code}" đã tồn tại.`,
          409,
        );
      }
    }

    return this.deps.customerGroupRepo.update(id, data);
  }

  async deleteCustomerGroup(id: number) {
    const group = await this.deps.customerGroupRepo.findById(id);
    if (!group) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupNotFound,
        `Không tìm thấy nhóm khách hàng để xóa.`,
        404,
      );
    }

    if (group.code === "default") {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupConflict,
        "Không thể xóa nhóm khách hàng mặc định của hệ thống.",
        400,
      );
    }

    if (group._count.customers > 0) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupConflict,
        `Không thể xóa nhóm khách hàng này vì đang có ${group._count.customers} khách hàng thuộc nhóm.`,
        409,
      );
    }

    if (group._count.rateCards > 0) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupConflict,
        `Không thể xóa nhóm khách hàng này vì đang được liên kết với ${group._count.rateCards} bảng giá cước.`,
        409,
      );
    }

    return this.deps.customerGroupRepo.delete(id);
  }

  async getMembers(groupId: number, search?: string, page = 1, perPage = 25) {
    return this.deps.customerGroupRepo.findMembers(groupId, search, page, perPage);
  }

  async getAvailableCustomers(groupId: number, search?: string, limit = 50) {
    return this.deps.customerGroupRepo.findAvailableCustomers(groupId, search, limit);
  }

  async assignMembers(groupId: number, customerIds: string[]) {
    const group = await this.deps.customerGroupRepo.findById(groupId);
    if (!group) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupNotFound,
        `Không tìm thấy nhóm khách hàng ID ${groupId}.`,
        404,
      );
    }
    return this.deps.customerGroupRepo.assignMembers(groupId, customerIds);
  }

  async removeMembers(groupId: number, customerIds: string[]) {
    const group = await this.deps.customerGroupRepo.findById(groupId);
    if (!group) {
      throw new ErrorWithCode(
        ErrorCode.CustomerGroupNotFound,
        `Không tìm thấy nhóm khách hàng ID ${groupId}.`,
        404,
      );
    }
    return this.deps.customerGroupRepo.removeMembers(groupId, customerIds);
  }
}
