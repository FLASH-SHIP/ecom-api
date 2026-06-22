import { getCategoryService, getPostService } from "@ecom/features/di/containers/BlogService";
import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";

@Controller("v2/blog")
export class BlogController {
  @Get("posts")
  async listPosts(
    @Query("page") page = "1",
    @Query("perPage") perPage = "10",
    @Query("search") search?: string,
    @Query("category") categoryId?: string,
  ) {
    const take = Math.min(Number(perPage), 50);

    const result = await getPostService().listPosts({
      status: "PUBLISHED",
      search,
      categoryId: categoryId ? Number(categoryId) : undefined,
      page: Number(page),
      perPage: take,
      sortBy: "publishedAt",
      sortOrder: "desc",
    });

    return result;
  }

  @Get("posts/:slug")
  async getPostBySlug(@Param("slug") slug: string) {
    try {
      const post = await getPostService().getPostBySlug(slug);

      // Fire-and-forget view increment — non-blocking
      getPostService()
        .recordView(post.id)
        .catch(() => {});

      return post;
    } catch {
      throw new NotFoundException("Post not found");
    }
  }

  @Get("categories")
  async listCategories() {
    const result = await getCategoryService().listCategories({ status: "PUBLISHED" });
    return result;
  }
}
