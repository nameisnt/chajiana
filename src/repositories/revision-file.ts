import { uploadFile, readFile, deleteFile } from './file-storage';
import { updateScopeFileRevision, updateGlobalFileRevision, getScopeFileRevision, getGlobalFileRevision } from './storage-index';
import type { ChatDomainId, StorageDomainId } from '@/types';

/**
 * 为聊天级数据构建文件名
 */
function buildChatFileName(scopeId: string, domain: ChatDomainId, revisionId: string): string {
  return `phone-${scopeId}-${domain}-${revisionId}.json`;
}

/**
 * 为全局数据构建文件名
 */
function buildGlobalFileName(domain: StorageDomainId, revisionId: string): string {
  return `phone-global-${domain}-${revisionId}.json`;
}

/**
 * 写入不可变 revision 文件
 *
 * 流程：写入新文件 → 回读校验 → 更新 storage index 指针 → 删除旧 revision
 */
export async function writeChatRevision<T>(
  scopeId: string,
  domain: ChatDomainId,
  data: T,
): Promise<{ revisionId: string; fileName: string }> {
  const revisionId = crypto.randomUUID();
  const fileName = buildChatFileName(scopeId, domain, revisionId);

  // 1. 写入新文件
  await uploadFile(fileName, data);

  // 2. 回读校验
  const readBack = await readFile<T>(fileName);
  if (!readBack) {
    throw new Error(`回读校验失败: ${fileName}`);
  }

  // 3. 更新 storage index 指针
  const oldRevisionId = getScopeFileRevision(
    (await import('./storage-index')).getCachedIndex()!,
    scopeId,
    domain,
  );
  await updateScopeFileRevision(scopeId, domain, revisionId);

  // 4. 删除旧文件
  if (oldRevisionId && oldRevisionId !== revisionId) {
    const oldFileName = buildChatFileName(scopeId, domain, oldRevisionId);
    deleteFile(oldFileName).catch(() => {
      // 删除失败不阻塞，记录待清理
      console.warn(`[酒馆手机] 旧 revision 文件清理失败: ${oldFileName}`);
    });
  }

  return { revisionId, fileName };
}

/**
 * 写入不可变全局 revision 文件
 */
export async function writeGlobalRevision<T>(
  domain: StorageDomainId,
  data: T,
): Promise<{ revisionId: string; fileName: string }> {
  const revisionId = crypto.randomUUID();
  const fileName = buildGlobalFileName(domain, revisionId);

  // 1. 写入新文件
  await uploadFile(fileName, data);

  // 2. 回读校验
  const readBack = await readFile<T>(fileName);
  if (!readBack) {
    throw new Error(`回读校验失败: ${fileName}`);
  }

  // 3. 更新 storage index 指针
  const oldRevisionId = getGlobalFileRevision(
    (await import('./storage-index')).getCachedIndex()!,
    domain,
  );
  await updateGlobalFileRevision(domain, revisionId);

  // 4. 删除旧文件
  if (oldRevisionId && oldRevisionId !== revisionId) {
    const oldFileName = buildGlobalFileName(domain, oldRevisionId);
    deleteFile(oldFileName).catch(() => {
      console.warn(`[酒馆手机] 旧 revision 文件清理失败: ${oldFileName}`);
    });
  }

  return { revisionId, fileName };
}

/**
 * 读取聊天级 revision 数据
 */
export async function readChatRevision<T>(
  scopeId: string,
  domain: ChatDomainId,
): Promise<T | null> {
  const index = (await import('./storage-index')).getCachedIndex();
  if (!index) return null;

  const revisionId = index.scopeFiles[scopeId]?.[domain];
  if (!revisionId) return null;

  const fileName = buildChatFileName(scopeId, domain, revisionId);
  return readFile<T>(fileName);
}

/**
 * 读取全局 revision 数据
 */
export async function readGlobalRevision<T>(
  domain: StorageDomainId,
): Promise<T | null> {
  const index = (await import('./storage-index')).getCachedIndex();
  if (!index) return null;

  const revisionId = index.globalFiles[domain];
  if (!revisionId) return null;

  const fileName = buildGlobalFileName(domain, revisionId);
  return readFile<T>(fileName);
}
