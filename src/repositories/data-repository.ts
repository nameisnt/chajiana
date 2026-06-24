import type { ChatDomainId, StorageDomainId } from '@/types';
import { writeChatRevision, readChatRevision, writeGlobalRevision, readGlobalRevision } from './revision-file';
import { loadIndex } from './storage-index';
import { readFromSettings, writeToSettings } from './file-storage';

/**
 * 统一的聊天级数据读写接口
 * 优先文件存储，失败回退 settings 兜底
 */
export async function loadChatData<T>(scopeId: string, domain: ChatDomainId): Promise<T | null> {
  await loadIndex();

  // 尝试从文件读取
  try {
    const data = await readChatRevision<T>(scopeId, domain);
    if (data !== null) return data;
  } catch { /* 文件读取失败，回退 settings */ }

  // 回退 settings 兜底
  return readFromSettings<T>(`chatData.${scopeId}.${domain}`);
}

export async function saveChatData<T>(
  scopeId: string,
  domain: ChatDomainId,
  data: T,
): Promise<void> {
  await loadIndex();

  // 移除 Vue Proxy 包装
  const raw = toRaw(data) as T;

  // 优先写入文件
  try {
    await writeChatRevision(scopeId, domain, raw);
    // 同时刷新 settings 兜底
    writeToSettings(`chatData.${scopeId}.${domain}`, raw);
    return;
  } catch { /* 文件写入失败，回退 settings */ }

  writeToSettings(`chatData.${scopeId}.${domain}`, raw);
}

/**
 * 统一的全局数据读写接口
 */
export async function loadGlobalData<T>(domain: StorageDomainId): Promise<T | null> {
  await loadIndex();

  try {
    const data = await readGlobalRevision<T>(domain);
    if (data !== null) return data;
  } catch { /* fallback */ }

  return readFromSettings<T>(`globalData.${domain}`);
}

export async function saveGlobalData<T>(domain: StorageDomainId, data: T): Promise<void> {
  await loadIndex();

  const raw = toRaw(data) as T;

  try {
    await writeGlobalRevision(domain, raw);
    writeToSettings(`globalData.${domain}`, raw);
    return;
  } catch { /* fallback */ }

  writeToSettings(`globalData.${domain}`, raw);
}

/**
 * 清空当前聊天的所有创作数据
 */
export async function clearChatData(scopeId: string): Promise<void> {
  const domains: ChatDomainId[] = ['diary', 'forum', 'extras', 'theater', 'letters', 'summaries'];

  for (const domain of domains) {
    // 写入空数据
    await saveChatData(scopeId, domain, { books: [], failedDrafts: [] });
  }

  // 移除该 scope 的收藏快照
  const favoriteModule = await import('./favorite-snapshots');
  await favoriteModule.removeAllSnapshotsForScope(scopeId);
}
