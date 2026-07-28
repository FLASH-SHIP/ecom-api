import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  bulkCategoryAssign,
  bulkDeleteCategories,
  bulkDeletePages,
  bulkDeletePosts,
  bulkDeleteTags,
  bulkStatusCustomers,
  bulkStatusPosts,
} from "./procedures/bulk.handler";
import {
  checkDuplicates,
  exportData,
  fullBackup,
  fullRestore,
  fullTextSearch,
  importData,
} from "./procedures/tools.handler";

export const toolsRouter = router({
  export: exportData,
  import: importData,
  fullBackup,
  fullRestore,
  checkDuplicates,
  fullTextSearch,
  bulk: router({
    deletePosts: bulkDeletePosts,
    statusPosts: bulkStatusPosts,
    categoryAssign: bulkCategoryAssign,
    deleteCategories: bulkDeleteCategories,
    deleteTags: bulkDeleteTags,
    deletePages: bulkDeletePages,
    statusCustomers: bulkStatusCustomers,
  }),
});
