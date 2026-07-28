import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  get as fileGet,
  list as fileList,
  move as fileMove,
  remove as fileRemove,
  removeMany as fileRemoveMany,
  stats as fileStats,
  update as fileUpdate,
} from "./procedures/files.handler";
import {
  create as folderCreate,
  get as folderGet,
  list as folderList,
  remove as folderRemove,
  tree as folderTree,
  update as folderUpdate,
} from "./procedures/folders.handler";

export const mediaRouter = router({
  folders: router({
    list: folderList,
    get: folderGet,
    tree: folderTree,
    create: folderCreate,
    update: folderUpdate,
    remove: folderRemove,
  }),
  files: router({
    list: fileList,
    get: fileGet,
    update: fileUpdate,
    remove: fileRemove,
    move: fileMove,
    removeMany: fileRemoveMany,
    stats: fileStats,
  }),
});
