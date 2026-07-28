export type ServiceGetter<T = any> = () => T;

const serviceRegistry = new Map<string, ServiceGetter>();

/**
 * Register a single service getter in the tRPC service registry.
 */
export function registerTRPCService<T = any>(name: string, getter: ServiceGetter<T>) {
  serviceRegistry.set(name, getter);
}

/**
 * Register multiple service getters in the tRPC service registry.
 */
export function registerTRPCServices(services: Record<string, ServiceGetter>) {
  for (const [name, getter] of Object.entries(services)) {
    serviceRegistry.set(name, getter());
  }
}

/**
 * Retrieve a registered service instance from the tRPC service registry.
 */
export function getService<T = any>(name: string): T {
  const getter = serviceRegistry.get(name);
  if (!getter) {
    throw new Error(`[tRPC Service Registry] Service '${name}' is not registered.`);
  }
  return getter();
}
