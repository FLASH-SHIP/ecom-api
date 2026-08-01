import type { ICarrierProvider } from '../carrier/interfaces/carrier-provider.interface';

export type PartnerCategory = 'carrier' | 'fulfillment' | 'customs' | 'address' | 'pod' | 'payment' | string;

export class PartnerProviderRegistry {
  private static instance: PartnerProviderRegistry;
  private registry: Map<string, Map<string, unknown>> = new Map();

  private constructor() {}

  public static getInstance(): PartnerProviderRegistry {
    if (!PartnerProviderRegistry.instance) {
      PartnerProviderRegistry.instance = new PartnerProviderRegistry();
    }
    return PartnerProviderRegistry.instance;
  }

  /**
   * Register a generic 3rd-party provider under a category and code
   */
  public registerProvider<T>(category: PartnerCategory, code: string, provider: T): void {
    const categoryKey = category.toLowerCase();
    const providerKey = code.toUpperCase();

    if (!this.registry.has(categoryKey)) {
      this.registry.set(categoryKey, new Map());
    }

    const categoryMap = this.registry.get(categoryKey)!;
    categoryMap.set(providerKey, provider);
  }

  /**
   * Get a registered 3rd-party provider by category and code
   */
  public getProvider<T>(category: PartnerCategory, code: string): T {
    const categoryKey = category.toLowerCase();
    const providerKey = code.toUpperCase();

    const categoryMap = this.registry.get(categoryKey);
    if (!categoryMap || !categoryMap.has(providerKey)) {
      throw new Error(`[PartnerProviderRegistry] Provider '${code}' under category '${category}' is not registered.`);
    }

    return categoryMap.get(providerKey) as T;
  }

  /**
   * Check if a provider is registered
   */
  public hasProvider(category: PartnerCategory, code: string): boolean {
    const categoryKey = category.toLowerCase();
    const providerKey = code.toUpperCase();
    return Boolean(this.registry.get(categoryKey)?.has(providerKey));
  }

  /**
   * Helper shortcut to register a Carrier Provider
   */
  public registerCarrier(carrier: ICarrierProvider): void {
    this.registerProvider<ICarrierProvider>('carrier', carrier.code, carrier);
  }

  /**
   * Helper shortcut to get a Carrier Provider
   */
  public getCarrier(code: string): ICarrierProvider {
    return this.getProvider<ICarrierProvider>('carrier', code);
  }

  /**
   * Clear registry (useful for unit tests reset)
   */
  public clear(): void {
    this.registry.clear();
  }
}
