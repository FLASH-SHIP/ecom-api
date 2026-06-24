import { SetMetadata } from "@nestjs/common";

export const VALIDATION_GROUPS_KEY = "validation_groups";

/**
 * Decorator to specify which validation groups should be used for route request validation.
 * Can be applied to controllers or individual route handler methods.
 *
 * @example
 * \@Post()
 * \@ValidationGroups('create')
 * async create(\@Body() dto: MyDto) { ... }
 */
export const ValidationGroups = (...groups: string[]) => SetMetadata(VALIDATION_GROUPS_KEY, groups);
