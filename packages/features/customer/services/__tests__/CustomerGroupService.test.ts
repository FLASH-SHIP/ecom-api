import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { describe, expect, it, vi } from "vitest";
import type { CustomerGroupRepository } from "../../repositories/CustomerGroupRepository";
import { CustomerGroupService } from "../CustomerGroupService";

function createMockRepo() {
  return {
    findMany: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as CustomerGroupRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("CustomerGroupService", () => {
  describe("listCustomerGroups", () => {
    it("should list paginated customer groups", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findMany.mockResolvedValue({
        items: [{ id: 1, name: "Tier 1", code: "tier1" }],
        total: 1,
        page: 1,
        perPage: 50,
        totalPages: 1,
      });

      const result = await service.listCustomerGroups({ search: "Tier" }, 1, 50);
      expect(result.items).toHaveLength(1);
      expect(repo.findMany).toHaveBeenCalledWith({ search: "Tier" }, 1, 50);
    });
  });

  describe("createCustomerGroup", () => {
    it("should create new customer group", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findByCode.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 1, name: "Tier 1", code: "tier1" });

      const result = await service.createCustomerGroup({ name: "Tier 1", code: "tier1" });
      expect(result.id).toBe(1);
      expect(repo.create).toHaveBeenCalledWith({ name: "Tier 1", code: "tier1" });
    });

    it("should throw error if code already exists", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findByCode.mockResolvedValue({ id: 2, name: "Existing", code: "tier1" });

      await expect(
        service.createCustomerGroup({ name: "Tier 1", code: "tier1" }),
      ).rejects.toThrowError(
        new ErrorWithCode(
          ErrorCode.CustomerGroupConflict,
          'Mã nhóm khách hàng "tier1" đã tồn tại.',
          409,
        ),
      );
    });
  });

  describe("deleteCustomerGroup", () => {
    it("should delete customer group successfully", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findById.mockResolvedValue({
        id: 1,
        name: "Tier 1",
        code: "tier1",
        _count: { customers: 0, rateCards: 0 },
      });
      repo.delete.mockResolvedValue({ id: 1 });

      const result = await service.deleteCustomerGroup(1);
      expect(result.id).toBe(1);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it("should throw error if group has customer members", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findById.mockResolvedValue({
        id: 1,
        name: "Tier 1",
        code: "tier1",
        _count: { customers: 5, rateCards: 0 },
      });

      await expect(service.deleteCustomerGroup(1)).rejects.toThrowError(
        new ErrorWithCode(
          ErrorCode.CustomerGroupConflict,
          "Không thể xóa nhóm khách hàng này vì đang có 5 khách hàng thuộc nhóm.",
          409,
        ),
      );
    });

    it("should throw error if group is linked to rate cards", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findById.mockResolvedValue({
        id: 1,
        name: "Tier 1",
        code: "tier1",
        _count: { customers: 0, rateCards: 2 },
      });

      await expect(service.deleteCustomerGroup(1)).rejects.toThrowError(
        new ErrorWithCode(
          ErrorCode.CustomerGroupConflict,
          "Không thể xóa nhóm khách hàng này vì đang được liên kết với 2 bảng giá cước.",
          409,
        ),
      );
    });

    it("should throw error if trying to delete default group", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findById.mockResolvedValue({
        id: 10,
        name: "Default Group",
        code: "default",
        _count: { customers: 0, rateCards: 0 },
      });

      await expect(service.deleteCustomerGroup(10)).rejects.toThrowError(
        new ErrorWithCode(
          ErrorCode.CustomerGroupConflict,
          "Không thể xóa nhóm khách hàng mặc định của hệ thống.",
          400,
        ),
      );
    });
  });

  describe("updateCustomerGroup", () => {
    it("should update a group successfully", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findById.mockResolvedValue({
        id: 1,
        name: "Tier 1",
        code: "tier1",
        _count: { customers: 0, rateCards: 0 },
      });
      repo.update.mockResolvedValue({ id: 1, name: "New Name", code: "tier1" });

      const result = await service.updateCustomerGroup(1, { name: "New Name" });
      expect(result.name).toBe("New Name");
    });

    it("should throw error if trying to update default group", async () => {
      const repo = createMockRepo();
      const service = new CustomerGroupService({ customerGroupRepo: repo });

      repo.findById.mockResolvedValue({
        id: 10,
        name: "Default Group",
        code: "default",
        _count: { customers: 0, rateCards: 0 },
      });

      await expect(service.updateCustomerGroup(10, { name: "New Name" })).rejects.toThrowError(
        new ErrorWithCode(
          ErrorCode.CustomerGroupConflict,
          "Không thể chỉnh sửa hoặc cập nhật nhóm khách hàng mặc định của hệ thống.",
          400,
        ),
      );
    });
  });
});
