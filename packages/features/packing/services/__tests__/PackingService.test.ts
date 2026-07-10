import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { describe, expect, it, vi } from "vitest";
import type { PackingRepository } from "../../repositories/PackingRepository";
import { PackingService } from "../PackingService";

function createMockRepo() {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  } as unknown as PackingRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("PackingService", () => {
  describe("getPackingType", () => {
    it("should return a packing type if it exists", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      const mockItem = { id: 1, name: "Cardboard box", status: "PUBLISHED" };

      repo.findById.mockResolvedValue(mockItem);

      const result = await service.getPackingType(1);
      expect(result).toEqual(mockItem);
      expect(repo.findById).toHaveBeenCalledWith(1);
    });

    it("should throw a NotFound error if it does not exist", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.getPackingType(99)).rejects.toThrowError(
        new ErrorWithCode(ErrorCode.NotFound, "Packing type not found", 404)
      );
    });
  });

  describe("listPackingTypes", () => {
    it("should fetch list of packing types with pagination", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      const mockResult = {
        items: [{ id: 1, name: "Cardboard box", status: "PUBLISHED" }],
        total: 1,
      };

      repo.list.mockResolvedValue(mockResult);

      const result = await service.listPackingTypes({ page: 1, limit: 10, search: "box" });
      expect(result.items).toEqual(mockResult.items);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(repo.list).toHaveBeenCalledWith({
        search: "box",
        status: undefined,
        skip: 0,
        take: 10,
        orderBy: undefined,
      });
    });
  });

  describe("createPackingType", () => {
    it("should create new packing type successfully", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      const createData = { name: "New Box", description: "Desc", status: "PUBLISHED" as const };
      const createdItem = { id: 3, ...createData };

      repo.findByName.mockResolvedValue(null);
      repo.create.mockResolvedValue(createdItem);

      const result = await service.createPackingType(createData);
      expect(result).toEqual(createdItem);
      expect(repo.findByName).toHaveBeenCalledWith("New Box");
      expect(repo.create).toHaveBeenCalledWith(createData);
    });

    it("should throw ValidationError if name is empty", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });

      await expect(service.createPackingType({ name: "  " })).rejects.toThrowError(
        new ErrorWithCode(ErrorCode.ValidationError, "Name is required", 422)
      );
    });

    it("should throw Conflict error if name already exists", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      repo.findByName.mockResolvedValue({ id: 1, name: "Cardboard box" });

      await expect(
        service.createPackingType({ name: "Cardboard box" })
      ).rejects.toThrowError(
        new ErrorWithCode(ErrorCode.Conflict, 'Packing type with name "Cardboard box" already exists', 409)
      );
    });
  });

  describe("updatePackingType", () => {
    it("should update an existing packing type", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      const existing = { id: 1, name: "Cardboard box" };
      const updated = { id: 1, name: "Updated Box" };

      repo.findById.mockResolvedValue(existing);
      repo.findByName.mockResolvedValue(null);
      repo.update.mockResolvedValue(updated);

      const result = await service.updatePackingType(1, { name: "Updated Box" });
      expect(result).toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith(1, { name: "Updated Box" });
    });

    it("should throw Conflict error if updated name is used by another packing type", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      const existing = { id: 1, name: "Cardboard box" };
      const otherExisting = { id: 2, name: "Other Box" };

      repo.findById.mockResolvedValue(existing);
      repo.findByName.mockResolvedValue(otherExisting);

      await expect(
        service.updatePackingType(1, { name: "Other Box" })
      ).rejects.toThrowError(
        new ErrorWithCode(ErrorCode.Conflict, 'Packing type with name "Other Box" already exists', 409)
      );
    });
  });

  describe("deletePackingType", () => {
    it("should soft delete packing type successfully", async () => {
      const repo = createMockRepo();
      const service = new PackingService({ packingRepo: repo });
      const existing = { id: 1, name: "Cardboard box" };

      repo.findById.mockResolvedValue(existing);
      repo.softDelete.mockResolvedValue({ id: 1 });

      const result = await service.deletePackingType(1);
      expect(result).toEqual({ id: 1 });
      expect(repo.softDelete).toHaveBeenCalledWith(1);
    });
  });
});
