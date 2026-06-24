/**
 * SillyTavern 文件存储 API 封装
 * 使用 /api/files/upload|verify|delete + GET 端点
 * 写入失败时回退到 extension_settings
 */

const EXTENSION_NAME = 'sillytavernPhone';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function encodeJsonToBase64(data: unknown): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(data, null, 2)));
}

function normalizeFilePath(path: string): string {
  return String(path || '').replace(/^\/+/, '');
}

function getRequestHeaders(): Record<string, string> {
  // SillyTavern exposes getRequestHeaders via window
  if (typeof (window as unknown as Record<string, unknown>).getRequestHeaders === 'function') {
    return ((window as unknown as Record<string, unknown>).getRequestHeaders as () => Record<string, string>)();
  }
  return {};
}

function isFileApiAvailable(): boolean {
  return typeof (window as unknown as Record<string, unknown>).getRequestHeaders === 'function';
}

/**
 * 上传 JSON 文件到 user/files
 */
export async function uploadFile(name: string, data: unknown): Promise<string> {
  if (!isFileApiAvailable()) {
    throw new Error('File API not available');
  }

  const payload = {
    schemaVersion: 1,
    kind: `sillytavernPhone.${name}`,
    updatedAt: new Date().toISOString(),
    data,
  };

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      name,
      data: encodeJsonToBase64(payload),
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }

  const result = (await response.json()) as { path?: string };
  return normalizeFilePath(result.path || `user/files/${name}`);
}

/**
 * 验证文件是否存在
 */
export async function verifyFile(path: string): Promise<boolean> {
  if (!isFileApiAvailable()) return false;

  try {
    const response = await fetch('/api/files/verify', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({ path: normalizeFilePath(path) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 读取 JSON 文件
 */
export async function readFile<T = unknown>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`/${normalizeFilePath(path)}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { kind?: string; data?: T };
    if (data.data !== undefined) return data.data as T;
    return data as unknown as T;
  } catch {
    return null;
  }
}

/**
 * 删除文件
 */
export async function deleteFile(path: string): Promise<boolean> {
  if (!isFileApiAvailable()) return false;

  try {
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({ path: normalizeFilePath(path) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 上传二进制文件（如壁纸）
 */
export async function uploadBinaryFile(name: string, blob: Blob): Promise<string> {
  if (!isFileApiAvailable()) {
    throw new Error('File API not available');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = bytesToBase64(new Uint8Array(arrayBuffer));

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ name, data: base64 }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }

  const result = (await response.json()) as { path?: string };
  return normalizeFilePath(result.path || `user/files/${name}`);
}

// ===== Settings 兜底 =====

export function readFromSettings<T>(key: string): T | null {
  const value = _.get(extension_settings, `${EXTENSION_NAME}.${key}`);
  return value ?? null;
}

export function writeToSettings<T>(key: string, data: T): void {
  _.set(extension_settings, `${EXTENSION_NAME}.${key}`, klona(data));
  saveSettingsDebounced();
}

export function isFileApiReady(): boolean {
  return isFileApiAvailable();
}
