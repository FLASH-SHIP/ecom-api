import { CategoryTransformer } from "@ecom/features/blog/transformers/CategoryTransformer";
import { PostTransformer } from "@ecom/features/blog/transformers/PostTransformer";
import { getCategoryService, getPostService } from "@ecom/features/di/containers/BlogService";
import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import type { ListPostsQueryDto } from "./dto/list-posts-query.dto";

@Controller("blog")
export class BlogController {
  @Get("posts")
  async listPosts(@Query() query: ListPostsQueryDto) {
    const result = await getPostService().listPosts({
      status: "PUBLISHED",
      search: query.search,
      categoryId: query.category,
      page: query.page,
      perPage: query.perPage,
      sortBy: "publishedAt",
      sortOrder: "desc",
    });

    return new PostTransformer().transformPaginated(result);
  }

  @Get("posts/:slug")
  async getPostBySlug(@Param("slug") slug: string) {
    try {
      const post = await getPostService().getPostBySlug(slug);

      // Fire-and-forget view increment — non-blocking
      getPostService()
        .recordView(post.id)
        .catch(() => {});

      return {
        data: new PostTransformer().transformItem(post),
      };
    } catch {
      throw new NotFoundException("Post not found");
    }
  }

  @Get("categories")
  async listCategories() {
    const result = await getCategoryService().listCategories({ status: "PUBLISHED" });
    return {
      data: new CategoryTransformer().transformCollection(result.items),
    };
  }
}
