import type { PhoneStorageIndex, ChatDomainId, StorageDomainId } from '@/types';
import { PhoneStorageIndexSchema } from '@/schemas/data.schema';
import { uploadFile, readFile, deleteFile, readFromSettings, writeToSettings } from './file-storage';

const INDEX_FILE_NAME = 'phone-storage-index.json';
const INDEX_CURRENT_VERSION = 1;

let cachedIndex: PhoneStorageIndex | null = null;
let commitQueue: Promise<void> = Promise.resolve();

function createDefaultIndex(): PhoneStorageIndex {
  return {
    schemaVersion: INDEX_CURRENT_VERSION,
    revision: crypto.randomUUID(),
    scopeBindings: {},
    scopeFiles: {},
    globalFiles: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 加载 storage index
 * 优先从文件读取，失败则从 settings 兜底
 */
export async function loadIndex(): Promise<PhoneStorageIndex> {
  // 尝试从文件读取
  const fileData = await readFile<PhoneStorageIndex>(INDEX_FILE_NAME);
  if (fileData) {
    const parsed = PhoneStorageIndexSchema.safeParse(fileData);
    if (parsed.success) {
      cachedIndex = parsed.data;
      mirrorIndexToSettings(cachedIndex);
      return cachedIndex;
    }
  }

  // 尝试从 settings 兜底读取
  const fallback = readFromSettings<PhoneStorageIndex>('indexMirror');
  if (fallback) {
    const parsed = PhoneStorageIndexSchema.safeParse(fallback);
    if (parsed.success) {
      cachedIndex = parsed.data;
      return cachedIndex;
    }
  }

  // 创建新的
  cachedIndex = createDefaultIndex();
  await saveIndex(cachedIndex);
  return cachedIndex;
}

/**
 * 获取缓存的 index（不重新加载）
 */
export function getCachedIndex(): PhoneStorageIndex | null {
  return cachedIndex;
}

/**
 * 保存 storage index
 * 先写文件 → 再更新镜像
 */
export async function saveIndex(index: PhoneStorageIndex): Promise<void> {
  const updatedIndex: PhoneStorageIndex = {
    ...index,
    revision: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await uploadFile(INDEX_FILE_NAME, updatedIndex);
  } catch {
    // 文件写入失败，至少更新 settings 兜底
    mirrorIndexToSettings(updatedIndex);
    throw new Error('保存 storage index 失败');
  }

  mirrorIndexToSettings(updatedIndex);
  cachedIndex = updatedIndex;
}

/**
 * 镜像 index 到 extension_settings
 */
function mirrorIndexToSettings(index: PhoneStorageIndex): void {
  writeToSettings('indexMirror', index);
}

/**
 * 串行化提交：通过 commit mutex 确保并发写入不互相覆盖
 */
export async function commitIndex(
  updater: (index: PhoneStorageIndex) => PhoneStorageIndex,
): Promise<PhoneStorageIndex> {
  return new Promise((resolve, reject) => {
    commitQueue = commitQueue
      .catch(() => {})
      .then(async () => {
        const current = cachedIndex ?? (await loadIndex());
        const updated = updater(current);
        await saveIndex(updated);
        resolve(updated);
      })
      .catch(reject);
  });
}

/**
 * 获取 scope 文件指针
 */
export function getScopeFileRevision(
  index: PhoneStorageIndex,
  scopeId: string,
  domain: ChatDomainId,
): string | undefined {
  return index.scopeFiles[scopeId]?.[domain];
}

/**
 * 获取全局文件指针
 */
export function getGlobalFileRevision(
  index: PhoneStorageIndex,
  domain: StorageDomainId,
): string | undefined {
  return index.globalFiles[domain];
}

/**
 * 更新 scope 文件指针
 */
export async function updateScopeFileRevision(
  scopeId: string,
  domain: ChatDomainId,
  revisionId: string,
): Promise<void> {
  await commitIndex((index) => {
    if (!index.scopeFiles[scopeId]) {
      index.scopeFiles[scopeId] = {};
    }
    index.scopeFiles[scopeId][domain] = revisionId;
    return index;
  });
}

/**
 * 更新全局文件指针
 */
export async function updateGlobalFileRevision(
  domain: StorageDomainId,
  revisionId: string,
): Promise<void> {
  await commitIndex((index) => {
    index.globalFiles[domain] = revisionId;
    return index;
  });
}
