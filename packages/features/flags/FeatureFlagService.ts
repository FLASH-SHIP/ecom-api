import { prisma } from "@ecom/prisma";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("FeatureFlags");

/**
 * Feature flag names — type-safe constants.
 * Inspired by Cal.com's feature flags + Laravel config/cache pattern.
 */
export const Flags = {
  WORKFLOW_ENABLED: "feature.workflow.enabled",
  COMMENTS_ENABLED: "feature.comments.enabled",
  PUBLIC_API_ENABLED: "feature.publicApi.enabled",
  ANALYTICS_ENABLED: "feature.analytics.enabled",
  REGISTRATION_ENABLED: "feature.registration.enabled",
  WEBHOOKS_ENABLED: "feature.webhooks.enabled",
  SCHEDULED_PUBLISH_ENABLED: "feature.scheduledPublish.enabled",
  MEDIA_UPLOAD_ENABLED: "feature.mediaUpload.enabled",
  REDIRECTS_ENABLED: "feature.redirects.enabled",
  TEMPLATES_ENABLED: "feature.templates.enabled",
} as const;

export type FlagName = (typeof Flags)[keyof typeof Flags];

// In-memory cache with TTL
const cache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Feature flag service backed by the Settings table + in-memory cache.
 *
 * Flags default to `true` (enabled) if not explicitly set.
 */
export class FeatureFlagService {
  /**
   * Check if a feature flag is enabled.
   */
  async isEnabled(flag: FlagName): Promise<boolean> {
    // Check cache first
    const cached = cache.get(flag);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Query from settings table
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: flag },
        select: { value: true },
      });

      const value = setting ? setting.value === "true" : true; // default: enabled
      cache.set(flag, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    } catch {
      log.warn(`Failed to read feature flag: ${flag}, defaulting to true`);
      return true;
    }
  }

  /**
   * Set a feature flag value.
   */
  async setFlag(flag: FlagName, enabled: boolean): Promise<void> {
    await prisma.setting.upsert({
      where: { key: flag },
      create: { key: flag, value: String(enabled) },
      update: { value: String(enabled) },
    });

    // Update cache immediately
    cache.set(flag, { value: enabled, expiresAt: Date.now() + CACHE_TTL_MS });

    log.info(`Feature flag "${flag}" set to ${enabled}`);
  }

  /**
   * Get all feature flags with their current values.
   */
  async getAllFlags(): Promise<Record<string, boolean>> {
    const flags: Record<string, boolean> = {};

    for (const flag of Object.values(Flags)) {
      flags[flag] = await this.isEnabled(flag);
    }

    return flags;
  }

  /**
   * Clear the in-memory cache (useful for testing or after bulk updates).
   */
  clearCache(): void {
    cache.clear();
  }
}

let instance: FeatureFlagService | null = null;

export function getFeatureFlagService(): FeatureFlagService {
  if (!instance) {
    instance = new FeatureFlagService();
  }
  return instance;
}
