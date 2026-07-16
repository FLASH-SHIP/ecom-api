# US Divisions Prompts

## Sync Implementation Status

Review what's been implemented for the US divisions and update specs/us-divisions/implementation.md.

## Seed US States & Cities

Run the seeder to populate `administrative_divisions` table with US states (level 1) and cities (level 2) from JSON data files.

## Build Admin Settings UI

Create the admin settings page at `/settings/us-divisions` with 2 tabs (States / Cities), following the same pattern as the VN divisions page.

## Generate Repository and Service Tests

Write unit tests for AdministrativeDivisionRepository and the division-related methods in AdministrativeService.

## Code Review

Review changes for: type safety, error handling, security, edge cases, index optimization, pagination performance with 31k+ cities.
