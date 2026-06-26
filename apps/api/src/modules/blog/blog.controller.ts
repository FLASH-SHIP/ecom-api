import { CategoryTransformer } from "@ecom/features/blog/transformers/CategoryTransformer";
import { PostTransformer } from "@ecom/features/blog/transformers/PostTransformer";
import { getCategoryService, getPostService } from "@ecom/features/di/containers/BlogService";
import { Controller, Get, NotFoundException, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CacheControlInterceptor } from "../../common/interceptors/cache-control.interceptor";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { ListPostsQueryDto } from "./dto/list-posts-query.dto";

@ApiTags("Blog")
@Controller("blog")
@UseInterceptors(new CacheControlInterceptor())
export class BlogController {
  @Get("posts")
  @ApiOperation({ summary: "List published blog posts" })
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
  @ApiOperation({ summary: "Get a published blog post by slug" })
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
  @ApiOperation({ summary: "List active categories" })
  async listCategories() {
    const result = await getCategoryService().listCategories({ status: "PUBLISHED" });
    return {
      data: new CategoryTransformer().transformCollection(result.items),
    };
  }
}
