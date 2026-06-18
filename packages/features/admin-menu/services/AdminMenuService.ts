import type { AdminMenuRepository } from "@ecom/features/admin-menu/repositories/AdminMenuRepository";
import { ErrorWithCode } from "@ecom/lib/errors";

export interface IAdminMenuServiceDeps {
  adminMenuRepo: AdminMenuRepository;
}

/** Admin menu item after tree query (with children + translations) */
type MenuItemWithChildren = Awaited<ReturnType<AdminMenuRepository["findAll"]>>[number];

export class AdminMenuService {
  private deps: IAdminMenuServiceDeps;
  constructor(deps: IAdminMenuServiceDeps) {
    this.deps = deps;
  }

  /**
   * Get the full admin menu tree.
   * Optionally filter by user permissions.
   */
  async getMenuTree(userPermissions?: string[]) {
    const tree = await this.deps.adminMenuRepo.findAll();

    if (!userPermissions) return tree;

    return this.filterByPermissions(tree, userPermissions);
  }

  /** Get all menu items as a flat list (for admin CRUD UI) */
  async listAll() {
    return this.deps.adminMenuRepo.findAllFlat();
  }

  async getMenuItem(id: number) {
    const item = await this.deps.adminMenuRepo.findById(id);
    if (!item) throw ErrorWithCode.Factory.NotFound("Menu item not found");
    return item;
  }

  async createMenuItem(data: {
    key: string;
    name: string;
    description?: string;
    icon?: string;
    route?: string;
    permissions?: string[];
    childrenDisplay?: string;
    section?: string;
    priority?: number;
    isActive?: boolean;
    parentId?: number;
  }) {
    const existing = await this.deps.adminMenuRepo.findByKey(data.key);
    if (existing) throw ErrorWithCode.Factory.Conflict("Menu item key already exists");

    return this.deps.adminMenuRepo.create(data);
  }

  async updateMenuItem(
    id: number,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      route?: string;
      permissions?: string[];
      childrenDisplay?: string;
      section?: string;
      priority?: number;
      isActive?: boolean;
      parentId?: number | null;
    },
  ) {
    const item = await this.deps.adminMenuRepo.findById(id);
    if (!item) throw ErrorWithCode.Factory.NotFound("Menu item not found");

    return this.deps.adminMenuRepo.update(id, data);
  }

  async deleteMenuItem(id: number) {
    const item = await this.deps.adminMenuRepo.findById(id);
    if (!item) throw ErrorWithCode.Factory.NotFound("Menu item not found");

    return this.deps.adminMenuRepo.delete(id);
  }

  async upsertTranslation(
    menuItemId: number,
    langCode: string,
    data: { name: string; description?: string; section?: string },
  ) {
    const item = await this.deps.adminMenuRepo.findById(menuItemId);
    if (!item) throw ErrorWithCode.Factory.NotFound("Menu item not found");

    return this.deps.adminMenuRepo.upsertTranslation(menuItemId, langCode, data);
  }

  async reorder(items: Array<{ id: number; priority: number; parentId?: number | null }>) {
    return this.deps.adminMenuRepo.reorder(items);
  }

  // ─── Private ──────────────────────────────────────

  private filterByPermissions(
    items: MenuItemWithChildren[],
    userPermissions: string[],
  ): MenuItemWithChildren[] {
    return items
      .filter((item) => {
        if (!item.isActive) return false;
        // No permissions required = always visible
        const requiredPerms = item.permissions as string[] | null;
        if (!requiredPerms || requiredPerms.length === 0) return true;
        // User must have at least one of the required permissions
        return requiredPerms.some((p) => userPermissions.includes(p));
      })
      .map((item) => ({
        ...item,
        children: this.filterByPermissions(
          item.children as MenuItemWithChildren[],
          userPermissions,
        ),
      }));
  }
}
