/**
 * Seeder Registry — register seeders in execution order.
 *
 * To add a new seeder:
 *  1. Create `seeders/NN-name.seeder.ts` implementing the `Seeder` interface
 *  2. Import and add it to the `SEEDERS` array below (respecting NN order)
 *
 * To run a single seeder (useful for quick fixes):
 *  SEED_ONLY=CustomFields yarn prisma:seed
 */

import { PermissionsSeeder } from "./01-permissions.seeder";
import { RolesSeeder } from "./02-roles.seeder";
import { AdminUserSeeder } from "./03-admin-user.seeder";
import { SettingsSeeder } from "./04-settings.seeder";
import { LanguagesSeeder } from "./05-languages.seeder";
import { CustomFieldsSeeder } from "./06-custom-fields.seeder";
import { AdminMenuSeeder } from "./07-admin-menu.seeder";
import { CountriesSeeder } from "./08-countries.seeder";
import { TransportModesSeeder } from "./09-transport-modes.seeder";
import type { Seeder } from "./seeder.interface";

/**
 * Ordered list of seeders to run.
 * Order matters: Roles depends on Permissions, AdminUser depends on Roles.
 */
export const SEEDERS: Seeder[] = [
  PermissionsSeeder, // 01 — no dependencies
  RolesSeeder, // 02 — depends on: Permissions
  AdminUserSeeder, // 03 — depends on: Roles
  SettingsSeeder, // 04 — no dependencies
  LanguagesSeeder, // 05 — no dependencies
  CustomFieldsSeeder, // 06 — no dependencies
  AdminMenuSeeder, // 07 — no dependencies
  CountriesSeeder, // 08 — no dependencies
  TransportModesSeeder, // 09 — no dependencies
];
