import type { AuthUser } from "@ecom/types";

export interface ResourceWithAuthor {
  authorId: string;
  [key: string]: unknown;
}

export const PostPolicy = {
  /**
   * Check if user can update a post.
   */
  canUpdate(user: AuthUser, post: ResourceWithAuthor): boolean {
    if (user.permissions.includes("blog.posts.update")) {
      return true;
    }
    if (user.permissions.includes("blog.posts.update_own")) {
      return post.authorId === user.id;
    }
    return false;
  },

  /**
   * Check if user can delete a post.
   */
  canDelete(user: AuthUser, post: ResourceWithAuthor): boolean {
    if (user.permissions.includes("blog.posts.delete")) {
      return true;
    }
    if (user.permissions.includes("blog.posts.delete_own")) {
      return post.authorId === user.id;
    }
    return false;
  },
};
