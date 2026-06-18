import { ErrorWithCode } from "@ecom/lib/errors";
import type { ContentStatus } from "@prisma/client";
import type { TagRepository } from "../repositories/TagRepository";
import type { SlugService } from "./SlugService";

interface ITagServiceDeps {
  tagRepo: TagRepository;
  slugService: SlugService;
}

export class TagService {
  private deps: ITagServiceDeps;
  constructor(deps: ITagServiceDeps) {
    this.deps = deps;
  }

  async listTags(options?: {
    search?: string;
    where?: Record<string, unknown>;
    page?: number;
    perPage?: number;
    sortBy?: "id" | "name" | "createdAt" | "status";
    sortDir?: "asc" | "desc";
  }) {
    return this.deps.tagRepo.findMany(options);
  }

  async getTag(id: number) {
    const tag = await this.deps.tagRepo.findByIdWithRelations(id);
    if (!tag) throw ErrorWithCode.Factory.NotFound("Tag not found");
    return tag;
  }

  async getTagBySlug(slug: string) {
    const tag = await this.deps.tagRepo.findBySlug(slug);
    if (!tag) throw ErrorWithCode.Factory.NotFound("Tag not found");
    return tag;
  }

  async createTag(data: {
    name: string;
    slug?: string;
    description?: string;
    status?: ContentStatus;
    authorId?: number;
    authorType?: string;
  }) {
    const { slug: customSlug, ...rest } = data;

    const slugRecord = await this.deps.slugService.createSlug(0, "Tag", data.name, customSlug);

    const tag = await this.deps.tagRepo.create({
      ...rest,
      slug: slugRecord.key,
    });

    await this.deps.slugService.updateSlug(tag.id, "Tag", data.name, slugRecord.key);

    return tag;
  }

  async updateTag(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      status?: ContentStatus;
    },
  ) {
    const existing = await this.deps.tagRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Tag not found");

    const { slug: customSlug, ...tagData } = data;

    const updatedTag = await this.deps.tagRepo.update(id, tagData);

    if (data.name || customSlug) {
      const slugRecord = await this.deps.slugService.updateSlug(
        id,
        "Tag",
        data.name ?? existing.name,
        customSlug,
      );
      if (slugRecord.key !== updatedTag.slug) {
        await this.deps.tagRepo.update(id, { slug: slugRecord.key });
      }
    }

    return this.deps.tagRepo.findByIdWithRelations(id);
  }

  /**
   * Resolve tag names to tag IDs — creates new tags if they don't exist.
   * Matches old CMS TagResolver pattern.
   */
  async resolveTagsByNames(names: string[]) {
    return this.deps.tagRepo.findOrCreateByNames(names);
  }

  async deleteTag(id: number) {
    const tag = await this.deps.tagRepo.findById(id);
    if (!tag) throw ErrorWithCode.Factory.NotFound("Tag not found");

    await this.deps.slugService.deleteSlug(id, "Tag");
    return this.deps.tagRepo.delete(id);
  }
}
