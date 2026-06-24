import type { GenerationAdapter } from '@/types';

const adapterMap = new Map<string, GenerationAdapter<unknown, unknown>>();

function makeKey(appId: string, actionId: string): string {
  return `${appId}:${actionId}`;
}

export function registerAdapter(adapter: GenerationAdapter<unknown, unknown>): void {
  const key = makeKey(adapter.appId, adapter.actionId);
  if (adapterMap.has(key)) {
    throw new Error(`Duplicate generation adapter: ${key}`);
  }
  adapterMap.set(key, adapter);
}

export function getAdapter(
  appId: string,
  actionId: string,
): GenerationAdapter<unknown, unknown> | undefined {
  return adapterMap.get(makeKey(appId, actionId));
}

export function getAdapters(appId: string): GenerationAdapter<unknown, unknown>[] {
  const result: GenerationAdapter<unknown, unknown>[] = [];
  for (const [key, adapter] of adapterMap) {
    if (key.startsWith(`${appId}:`)) {
      result.push(adapter);
    }
  }
  return result;
}

export function getAllAdapters(): GenerationAdapter<unknown, unknown>[] {
  return Array.from(adapterMap.values());
}

export function disposeAllAdapters(): void {
  adapterMap.clear();
}
