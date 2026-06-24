import type { PhoneAppDefinition, PhoneAppModule } from '@/types';
import { BUILTIN_APPS } from '@/constants/app-defaults';

const appMap = new Map<string, PhoneAppDefinition>();
const moduleCache = new Map<string, PhoneAppModule>();

export function registerApp(def: PhoneAppDefinition): void {
  if (appMap.has(def.id)) {
    throw new Error(`Duplicate app id: ${def.id}`);
  }
  appMap.set(def.id, def);
}

export function getApp(id: string): PhoneAppDefinition | undefined {
  return appMap.get(id);
}

export function getAllApps(): PhoneAppDefinition[] {
  return Array.from(appMap.values());
}

export async function loadAppModule(id: string): Promise<PhoneAppModule | undefined> {
  if (moduleCache.has(id)) {
    return moduleCache.get(id);
  }
  const def = appMap.get(id);
  if (!def) return undefined;
  const mod = await def.load();
  moduleCache.set(id, mod);
  return mod;
}

export function getCachedModule(id: string): PhoneAppModule | undefined {
  return moduleCache.get(id);
}

export function registerBuiltinApps(): void {
  for (const def of BUILTIN_APPS) {
    registerApp(def);
  }
}

export function disposeAllApps(): void {
  for (const mod of moduleCache.values()) {
    mod.dispose?.();
  }
  moduleCache.clear();
}
