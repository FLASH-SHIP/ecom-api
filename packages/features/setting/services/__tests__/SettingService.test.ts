import { describe, expect, it, vi } from "vitest";
import type { SettingRepository } from "../../repositories/SettingRepository";
import { SettingService } from "../SettingService";

function createMockSettingRepo() {
  return {
    findByKey: vi.fn(),
    findByKeys: vi.fn(),
    findAll: vi.fn(),
    set: vi.fn(),
    bulkSet: vi.fn(),
    findByGroup: vi.fn(),
  } as unknown as SettingRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("SettingService", () => {
  describe("get", () => {
    it("should return setting value when found", async () => {
      const settingRepo = createMockSettingRepo();
      const service = new SettingService({ settingRepo });

      settingRepo.findByKey.mockResolvedValue({ key: "site_name", value: "Ecom" });

      const result = await service.get("site_name");
      expect(result).toBe("Ecom");
    });

    it("should return null when setting not found", async () => {
      const settingRepo = createMockSettingRepo();
      const service = new SettingService({ settingRepo });

      settingRepo.findByKey.mockResolvedValue(null);

      const result = await service.get("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getMany", () => {
    it("should return map of settings with null for missing keys", async () => {
      const settingRepo = createMockSettingRepo();
      const service = new SettingService({ settingRepo });

      settingRepo.findByKeys.mockResolvedValue([{ key: "site_name", value: "Ecom" }]);

      const result = await service.getMany(["site_name", "site_logo"]);
      expect(result).toEqual({
        site_name: "Ecom",
        site_logo: null,
      });
    });
  });

  describe("set", () => {
    it("should set a value and invalidate cache", async () => {
      const settingRepo = createMockSettingRepo();
      const service = new SettingService({ settingRepo });

      settingRepo.set.mockResolvedValue({ key: "site_name", value: "New Name" });

      const result = await service.set("site_name", "New Name");
      expect(result).toEqual({ key: "site_name", value: "New Name" });
      expect(settingRepo.set).toHaveBeenCalledWith("site_name", "New Name");
    });
  });

  describe("bulkSet", () => {
    it("should set multiple values and invalidate cache", async () => {
      const settingRepo = createMockSettingRepo();
      const service = new SettingService({ settingRepo });

      const items = [
        { key: "site_name", value: "Ecom" },
        { key: "site_description", value: "CMS" },
      ];
      settingRepo.bulkSet.mockResolvedValue(items);

      const result = await service.bulkSet(items);
      expect(result).toEqual(items);
    });
  });
});
