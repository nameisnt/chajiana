import { loadIndex, getCachedIndex } from './storage-index';
import { readChatRevision, readGlobalRevision } from './revision-file';
import { uploadFile, readFile, deleteFile } from './file-storage';
import type { ChatDomainId, StorageDomainId, PhoneStorageIndex } from '@/types';
import { loadAllSnapshots } from './favorite-snapshots';

/**
 * 导出完整 ZIP 备份
 */
export async function exportFullBackup(): Promise<{ blob: Blob; fileName: string }> {
  const { fflate } = await import('fflate');
  const index = getCachedIndex() ?? (await loadIndex());
  if (!index) throw new Error('Storage index not loaded');

  const files: Record<string, Uint8Array> = {};
  const manifestEntries: Array<{
    path: string;
    size: number;
    mime: string;
    sha256: string;
  }> = [];

  // 1. 打包 storage index
  const indexJson = JSON.stringify(index, null, 2);
  files['phone-storage-index.json'] = new TextEncoder().encode(indexJson);
  files['manifest.json'] = new TextEncoder().encode(''); // 先占位，最后填充

  // 2. 打包所有 scope 数据文件
  for (const [scopeId, domainMap] of Object.entries(index.scopeFiles)) {
    for (const [domain, revisionId] of Object.entries(domainMap)) {
      if (!revisionId) continue;
      const fileName = `phone-${scopeId}-${domain}-${revisionId}.json`;
      const data = await readChatRevision<unknown>(scopeId, domain as ChatDomainId);
      if (data) {
        files[fileName] = new TextEncoder().encode(JSON.stringify(data, null, 2));
      }
    }
  }

  // 3. 打包所有全局数据文件
  for (const [domain, revisionId] of Object.entries(index.globalFiles)) {
    if (!revisionId) continue;
    const fileName = `phone-global-${domain}-${revisionId}.json`;
    const data = await readGlobalRevision<unknown>(domain as StorageDomainId);
    if (data) {
      files[fileName] = new TextEncoder().encode(JSON.stringify(data, null, 2));
    }
  }

  // 4. 计算 SHA-256 并生成 manifest
  for (const [path, content] of Object.entries(files)) {
    if (path === 'manifest.json') continue;
    const hash = await sha256(content);
    manifestEntries.push({
      path,
      size: content.byteLength,
      mime: 'application/json',
      sha256: hash,
    });
  }

  const manifest = {
    version: '1.0.0',
    schemaVersion: index.schemaVersion,
    exportedAt: new Date().toISOString(),
    entries: manifestEntries,
  };
  files['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

  // 5. 压缩 ZIP
  const zipData = fflate.zipSync(files, { level: 6 });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    blob: new Blob([zipData], { type: 'application/zip' }),
    fileName: `phone-backup-${timestamp}.zip`,
  };
}

/**
 * 导入完整 ZIP 备份
 */
export async function importFullBackup(zipBlob: Blob): Promise<{ success: true } | { success: false; error: string }> {
  const { fflate } = await import('fflate');

  // 大小限制 100 MiB
  if (zipBlob.size > 100 * 1024 * 1024) {
    return { success: false, error: '压缩包超过 100 MiB 限制' };
  }

  try {
    const arrayBuffer = await zipBlob.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));

    // 1. 读取 manifest
    const manifestRaw = unzipped['manifest.json'];
    if (!manifestRaw) {
      return { success: false, error: 'manifest.json 缺失' };
    }

    const manifest = JSON.parse(new TextDecoder().decode(manifestRaw)) as {
      version: string;
      schemaVersion: number;
      entries: Array<{ path: string; size: number; sha256: string }>;
    };

    // 2. 校验文件清单
    for (const entry of manifest.entries) {
      const fileData = unzipped[entry.path];
      if (!fileData) {
        return { success: false, error: `缺少文件: ${entry.path}` };
      }
      if (fileData.byteLength !== entry.size) {
        return { success: false, error: `文件大小不匹配: ${entry.path}` };
      }
      const hash = await sha256(fileData);
      if (hash !== entry.sha256) {
        return { success: false, error: `SHA-256 校验失败: ${entry.path}` };
      }
    }

    // 3. 上传所有文件
    for (const entry of manifest.entries) {
      if (entry.path === 'phone-storage-index.json') {
        // 先上传数据文件，最后上传 index
        continue;
      }

      const fileData = unzipped[entry.path];
      const json = JSON.parse(new TextDecoder().decode(fileData));

      if (entry.path.startsWith('phone-global-wallpaper-')) {
        // 壁纸文件特殊处理
        continue;
      }

      await uploadFile(entry.path, json);
    }

    // 4. 最后上传 index
    const indexData = unzipped['phone-storage-index.json'];
    if (indexData) {
      const index = JSON.parse(new TextDecoder().decode(indexData)) as PhoneStorageIndex;
      await uploadFile('phone-storage-index.json', index);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '导入失败',
    };
  }
}

/**
 * 计算 SHA-256
 */
async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 触发文件下载
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
