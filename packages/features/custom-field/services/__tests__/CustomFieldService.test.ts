import type { PrismaClient } from "@ecom/prisma";
import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";
import type { CustomFieldValueRepository } from "../../repositories/CustomFieldValueRepository";
import type { FieldGroupRepository } from "../../repositories/FieldGroupRepository";
import type { FieldItemRepository } from "../../repositories/FieldItemRepository";
import { CustomFieldService } from "../CustomFieldService";

type MockedRepository<T> = {
  // biome-ignore lint/suspicious/noExplicitAny: generic mock mapped type allowing partial signatures
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<any> : T[K];
} & T;

function createMockGroupRepo() {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  } as unknown as MockedRepository<FieldGroupRepository>;
}

function createMockItemRepo() {
  return {
    findMany: vi.fn(),
    findByGroupId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  } as unknown as MockedRepository<FieldItemRepository>;
}

function createMockValueRepo() {
  return {
    findByEntity: vi.fn(),
    upsert: vi.fn(),
    removeByEntity: vi.fn(),
  } as unknown as MockedRepository<CustomFieldValueRepository>;
}

function createService() {
  const groupRepo = createMockGroupRepo();
  const itemRepo = createMockItemRepo();
  const valueRepo = createMockValueRepo();
  const prisma = {} as unknown as PrismaClient;
  const service = new CustomFieldService({ groupRepo, itemRepo, valueRepo, prisma });
  return { service, groupRepo, itemRepo, valueRepo };
}

describe("CustomFieldService", () => {
  describe("Groups CRUD", () => {
    it("should list groups", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findMany.mockResolvedValue({ rows: [{ id: 1, title: "Basic Info" }], total: 1 });

      const result = await service.listGroups();
      expect(result.rows).toHaveLength(1);
    });

    it("should get a group by id", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findById.mockResolvedValue({ id: 1, title: "Test" });

      const result = await service.getGroup(1);
      expect(result.title).toBe("Test");
    });

    it("should throw NotFound for missing group", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findById.mockResolvedValue(null);

      await expect(service.getGroup(999)).rejects.toThrow("Field group not found");
    });

    it("should create a group", async () => {
      const { service, groupRepo } = createService();
      groupRepo.create.mockResolvedValue({ id: 1, title: "New Group" });

      const result = await service.createGroup({ title: "New Group" });
      expect(result.id).toBe(1);
    });

    it("should delete a group", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findById.mockResolvedValue({ id: 1, title: "Test" });
      groupRepo.remove.mockResolvedValue({ id: 1 });

      await service.deleteGroup(1);
      expect(groupRepo.remove).toHaveBeenCalledWith(1);
    });
  });

  describe("Rules Engine", () => {
    it("should return all groups when no rules are set", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findMany.mockResolvedValue({
        rows: [
          { id: 1, title: "No rules", rules: null },
          { id: 2, title: "Empty rules", rules: {} },
        ],
        total: 2,
      });

      const result = await service.getFieldsForContext({ modelName: "Post" });
      expect(result).toHaveLength(2);
    });

    it("should filter by model name", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findMany.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: "Post Fields",
            rules: [[{ name: "model_name", type: "==", value: "Post" }]],
          },
          {
            id: 2,
            title: "Page Fields",
            rules: [[{ name: "model_name", type: "==", value: "Page" }]],
          },
        ],
        total: 2,
      });

      const result = await service.getFieldsForContext({ modelName: "Post" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Post Fields");
    });

    it("should filter by category", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findMany.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: "Tech Fields",
            rules: [
              [{ name: "category", type: "==", value: "1" }],
              [{ name: "category", type: "==", value: "2" }],
            ],
          },
        ],
        total: 1,
      });

      const result = await service.getFieldsForContext({ categoryId: 1 });
      expect(result).toHaveLength(1);

      const result2 = await service.getFieldsForContext({ categoryId: 99 });
      expect(result2).toHaveLength(0);
    });

    it("should filter by page template", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findMany.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: "Landing Fields",
            rules: [[{ name: "page_template", type: "==", value: "landing" }]],
          },
        ],
        total: 1,
      });

      const result = await service.getFieldsForContext({ pageTemplate: "landing" });
      expect(result).toHaveLength(1);

      const result2 = await service.getFieldsForContext({ pageTemplate: "default" });
      expect(result2).toHaveLength(0);
    });

    it("should require all conditions to match (AND logic)", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findMany.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: "Specific",
            rules: [
              [
                { name: "model_name", type: "==", value: "Post" },
                { name: "post_format", type: "==", value: "video" },
              ],
            ],
          },
        ],
        total: 1,
      });

      // Both match
      const result1 = await service.getFieldsForContext({
        modelName: "Post",
        postFormat: "video",
      });
      expect(result1).toHaveLength(1);

      // Only one matches
      const result2 = await service.getFieldsForContext({
        modelName: "Post",
        postFormat: "standard",
      });
      expect(result2).toHaveLength(0);
    });
  });

  describe("Duplication", () => {
    it("should duplicate a group with its items", async () => {
      const { service, groupRepo, itemRepo } = createService();

      const originalGroup = {
        id: 1,
        title: "Original",
        order: 0,
        rules: null,
        status: "published",
        items: [
          {
            id: 10,
            slug: "field1",
            title: "Field 1",
            name: "field1",
            type: "text",
            parentId: null,
            order: 0,
            placeholder: null,
            instructions: null,
            options: null,
            defaultValue: null,
          },
          {
            id: 11,
            slug: "field2",
            title: "Field 2",
            name: "field2",
            type: "textarea",
            parentId: null,
            order: 1,
            placeholder: null,
            instructions: null,
            options: null,
            defaultValue: null,
          },
        ],
      };

      const duplicatedGroup = {
        id: 2,
        title: "Original (Copy)",
        items: [],
      };

      groupRepo.findById
        .mockResolvedValueOnce(originalGroup) // First call: get original
        .mockResolvedValueOnce(duplicatedGroup); // Second call: return duplicated

      groupRepo.create.mockResolvedValue({ id: 2, title: "Original (Copy)" });
      itemRepo.create.mockResolvedValueOnce({ id: 20 }).mockResolvedValueOnce({ id: 21 });

      const result = await service.duplicateGroup(1);
      expect(result?.title).toBe("Original (Copy)");
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Original (Copy)" }),
      );
    });

    it("should throw NotFound when duplicating missing group", async () => {
      const { service, groupRepo } = createService();
      groupRepo.findById.mockResolvedValue(null);

      await expect(service.duplicateGroup(999)).rejects.toThrow("Field group not found");
    });
  });

  describe("Importing", () => {
    it("should import a group with rule conversion and item option extraction", async () => {
      const { service, groupRepo, itemRepo } = createService();

      groupRepo.create.mockResolvedValue({ id: 100, title: "Post Additional Information" });
      itemRepo.create.mockResolvedValue({ id: 200 });

      const importPayload = [
        {
          id: 1,
          title: "Post Additional Information",
          status: {
            value: "published",
            label: "Published",
          },
          order: 0,
          rules: '[[{"name":"model_name","type":"==","value":"Botble\\\\Blog\\\\Models\\\\Post"}]]',
          items: [
            {
              id: 1,
              field_group_id: 1,
              parent_id: null,
              order: 0,
              title: "Post Options",
              slug: "post_options",
              type: "checkbox",
              instructions: "Select post display options",
              options:
                '{"selectChoices":"featured:Featured post\\nsticky:Sticky post","defaultValue":"featured"}',
              children: [],
            },
          ],
        },
      ];

      const result = await service.importGroups(importPayload);
      expect(result.created).toBe(1);

      // Verify that group rules were converted
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Post Additional Information",
          rules: [[{ name: "model_name", type: "==", value: "post" }]],
        }),
      );

      // Verify that options, defaultValue and placeholder are extracted/parsed
      expect(itemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 100,
          slug: "post_options",
          title: "Post Options",
          type: "checkbox",
          options: [
            { label: "Featured post", value: "featured" },
            { label: "Sticky post", value: "sticky" },
          ],
          defaultValue: "featured",
        }),
      );
    });
  });
});
