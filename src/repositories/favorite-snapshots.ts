import type { GlobalFavoriteSnapshot, ContentType, FavoriteSnapshotPayload } from '@/types';
import { loadGlobalData, saveGlobalData } from './data-repository';

const FAVORITES_DOMAIN = 'favorite-snapshots' as const;

/**
 * 生成快照唯一键
 */
export function snapshotKey(scopeId: string, contentType: ContentType, entityId: string): string {
  return `${scopeId}:${contentType}:${entityId}`;
}

/**
 * 加载全部收藏快照
 */
export async function loadAllSnapshots(): Promise<GlobalFavoriteSnapshot[]> {
  const data = await loadGlobalData<{ snapshots: GlobalFavoriteSnapshot[] }>(FAVORITES_DOMAIN);
  return data?.snapshots ?? [];
}

/**
 * 保存全部收藏快照
 */
async function saveAllSnapshots(snapshots: GlobalFavoriteSnapshot[]): Promise<void> {
  await saveGlobalData(FAVORITES_DOMAIN, { snapshots });
}

/**
 * 创建或更新收藏快照
 */
export async function upsertSnapshot(
  scopeId: string,
  contentType: ContentType,
  entityId: string,
  title: string,
  payload: FavoriteSnapshotPayload,
): Promise<void> {
  const snapshots = await loadAllSnapshots();
  const key = snapshotKey(scopeId, contentType, entityId);
  const idx = snapshots.findIndex((s) => s.key === key);

  const entry: GlobalFavoriteSnapshot = {
    key,
    sourceScopeId: scopeId,
    contentType,
    entityId,
    title,
    updatedAt: new Date().toISOString(),
    payload,
  };

  if (idx >= 0) {
    snapshots[idx] = entry;
  } else {
    snapshots.push(entry);
  }

  await saveAllSnapshots(snapshots);
}

/**
 * 删除单个收藏快照
 */
export async function deleteSnapshot(
  scopeId: string,
  contentType: ContentType,
  entityId: string,
): Promise<void> {
  const snapshots = await loadAllSnapshots();
  const key = snapshotKey(scopeId, contentType, entityId);
  const filtered = snapshots.filter((s) => s.key !== key);
  await saveAllSnapshots(filtered);
}

/**
 * 批量删除快照
 */
export async function batchDeleteSnapshots(keys: string[]): Promise<void> {
  const snapshots = await loadAllSnapshots();
  const keySet = new Set(keys);
  const filtered = snapshots.filter((s) => !keySet.has(s.key));
  await saveAllSnapshots(filtered);
}

/**
 * 移除指定 scope 的所有快照
 */
export async function removeAllSnapshotsForScope(scopeId: string): Promise<void> {
  const snapshots = await loadAllSnapshots();
  const filtered = snapshots.filter((s) => s.sourceScopeId !== scopeId);
  await saveAllSnapshots(filtered);
}

/**
 * 移除指定 scope 中特定类型的所有快照
 */
export async function removeSnapshotsForDomain(
  scopeId: string,
  contentType: ContentType,
): Promise<void> {
  const snapshots = await loadAllSnapshots();
  const filtered = snapshots.filter(
    (s) => !(s.sourceScopeId === scopeId && s.contentType === contentType),
  );
  await saveAllSnapshots(filtered);
}

/**
 * 获取指定 scope 的收藏列表（用于实时派生 favorite 字段）
 */
export function getScopeFavorites(
  snapshots: GlobalFavoriteSnapshot[],
  scopeId: string,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const s of snapshots) {
    if (s.sourceScopeId === scopeId) {
      map.set(s.entityId, true);
    }
  }
  return map;
}
