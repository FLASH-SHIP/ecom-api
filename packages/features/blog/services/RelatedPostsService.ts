import { createLogger } from "@ecom/lib/logger";

const log = createLogger("RelatedPosts");

interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: Date | null;
  categoryIds: number[];
  tagIds: number[];
}

interface RelatedPostResult {
  post: PostSummary;
  score: number;
}

interface IRelatedPostsDeps {
  findPostWithRelations: (id: number) => Promise<{
    id: number;
    categoryIds: number[];
    tagIds: number[];
    authorId: number;
  } | null>;
  findCandidates: (options: {
    excludeId: number;
    categoryIds: number[];
    tagIds: number[];
    limit: number;
  }) => Promise<PostSummary[]>;
}

/**
 * Related Posts Algorithm.
 *
 * Scoring:
 *   - Shared category:   3 points each
 *   - Shared tag:         2 points each
 *   - Same author:        1 point
 *
 * Returns top N posts sorted by relevance score.
 */
export class RelatedPostsService {
  private deps: IRelatedPostsDeps;
  constructor(deps: IRelatedPostsDeps) {
    this.deps = deps;
  }

  async findRelated(postId: number, limit = 5): Promise<RelatedPostResult[]> {
    const source = await this.deps.findPostWithRelations(postId);
    if (!source) return [];

    const candidates = await this.deps.findCandidates({
      excludeId: postId,
      categoryIds: source.categoryIds,
      tagIds: source.tagIds,
      limit: limit * 3,
    });

    const scored: RelatedPostResult[] = candidates.map((candidate) => {
      let score = 0;

      // Category overlap: 3 points per shared category
      const sharedCategories = candidate.categoryIds.filter((id) =>
        source.categoryIds.includes(id),
      );
      score += sharedCategories.length * 3;

      // Tag overlap: 2 points per shared tag
      const sharedTags = candidate.tagIds.filter((id) => source.tagIds.includes(id));
      score += sharedTags.length * 2;

      return { post: candidate, score };
    });

    const results = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    log.info(`Found ${results.length} related posts for post ${postId}`);
    return results;
  }
}
