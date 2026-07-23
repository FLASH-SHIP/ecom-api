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

import { CountriesSeeder } from "./08-countries.seeder";
import { TransportModesSeeder } from "./09-transport-modes.seeder";
import { PackingTypesSeeder } from "./12-packing.seeder";
import { AdministrativeDivisionsSeeder } from "./13-administrative.seeder";
import { UsDivisionsSeeder } from "./14-us-divisions.seeder";
import { AdminUserSeeder } from "./AdminUserSeeder";
import { CustomersSeeder } from "./CustomersSeeder";
import { CustomFieldsSeeder } from "./CustomFieldsSeeder";
import { LanguagesSeeder } from "./LanguagesSeeder";
import { NotificationTemplatesSeeder } from "./NotificationTemplatesSeeder";
import { PartnersSeeder } from "./PartnersSeeder";
import { PermissionsSeeder } from "./PermissionsSeeder";
import { RateCardsSeeder } from "./RateCardsSeeder";
import { RolesSeeder } from "./RolesSeeder";
import { SettingsSeeder } from "./SettingsSeeder";
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
  NotificationTemplatesSeeder, // 05b — no dependencies
  CustomFieldsSeeder, // 06 — no dependencies
  RateCardsSeeder, // 11 — depends on: Customer
  CustomersSeeder, // 12 — depends on: RateCardsSeeder (for CustomerGroups)
  CountriesSeeder, // 08 — no dependencies
  TransportModesSeeder, // 09 — no dependencies
  PartnersSeeder, // 10 — no dependencies
  PackingTypesSeeder, // 12 — no dependencies
  AdministrativeDivisionsSeeder, // 13 — depends on: none (or countries)
  UsDivisionsSeeder, // 14 — depends on: none
];
