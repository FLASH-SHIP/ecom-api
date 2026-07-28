import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  addItem,
  createGroup,
  deleteGroup,
  duplicateGroup,
  exportGroups,
  getFieldBoxes,
  getFieldsForContext,
  getGroup,
  getRuleGroups,
  importGroups,
  listGroups,
  removeItem,
  saveModelFields,
  updateGroup,
  updateItem,
} from "./procedures/custom-fields.handler";

export const customFieldsRouter = router({
  // Groups
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  duplicateGroup,
  // Context + Rules
  getFieldsForContext,
  getRuleGroups,
  getFieldBoxes,
  // Items
  addItem,
  updateItem,
  removeItem,
  // Values (bulk, transactional)
  saveModelFields,
  // Export / Import
  exportGroups,
  importGroups,
});
