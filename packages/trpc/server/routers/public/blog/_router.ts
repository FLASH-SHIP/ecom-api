import { router } from "@ecom/trpc/server/trpc";
import {
  categories,
  getBySlug,
  listComments,
  listPosts,
  relatedPosts,
  search,
  submitComment,
  tags,
} from "./procedures/blog.handler";

export const blogRouter = router({
  listPosts,
  getBySlug,
  categories,
  tags,
  listComments,
  submitComment,
  relatedPosts,
  search,
});
