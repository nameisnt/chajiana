import { extension_settings } from '@sillytavern/scripts/extensions';
import type { ScopeBinding } from '@/types';
import { loadIndex, commitIndex } from './storage-index';

/**
 * 获取当前聊天的上下文信息
 */
function getCurrentContext() {
  try {
    const context = (window as unknown as Record<string, unknown>).SillyTavern?.getContext?.() as
      | Record<string, unknown>
      | undefined;
    if (context) return context;
  } catch { /* ignore */ }

  return undefined;
}

/**
 * 获取当前角色卡的头像文件 ID（作为 ownerKey 的一部分）
 */
function getCurrentOwnerKey(): string | null {
  const context = getCurrentContext();
  if (!context) return null;

  const groupId = context.groupId as string | undefined;
  if (groupId) {
    return `group:${groupId}`;
  }

  const character = context.character as Record<string, unknown> | undefined;
  if (character?.avatar) {
    return `char:${character.avatar}`;
  }

  return null;
}

/**
 * 获取当前聊天 ID
 */
function getCurrentChatId(): string {
  const context = getCurrentContext();
  if (context?.chatId) return String(context.chatId);
  if (context?.chat?.chat_id) return String(context.chat?.chat_id);
  return 'unknown';
}

/**
 * 解析 scope 绑定
 * 在聊天切换时调用
 */
export async function resolveScopeBinding(): Promise<{ scopeId: string; isNew: boolean }> {
  const context = getCurrentContext();
  const chatMetadata = context?.chatMetadata as Record<string, unknown> | undefined;
  const existingScopeId = chatMetadata?.sillytavernPhone?.scopeId as string | undefined;
  const ownerKey = getCurrentOwnerKey();
  const chatId = getCurrentChatId();

  if (!ownerKey) {
    throw new Error('无法获取当前角色卡信息');
  }

  const index = await loadIndex();

  // 情况 1：metadata 中有 scopeId 且仍在 index 中
  if (existingScopeId && index.scopeBindings[existingScopeId]) {
    const binding = index.scopeBindings[existingScopeId];

    // 1a. chatId 匹配 → 正常沿用
    if (binding.chatId === chatId) {
      return { scopeId: existingScopeId, isNew: false };
    }

    // 1b. chatId 不同 → Branch/Checkpoint → 创建新 scopeId + 复制数据
    return await createBranchScope(existingScopeId, ownerKey, chatId);
  }

  // 情况 2：按 ownerKey + chatId 查找唯一 binding
  const matchingBinding = Object.entries(index.scopeBindings).find(
    ([, b]) => b.ownerKey === ownerKey && b.chatId === chatId,
  );

  if (matchingBinding) {
    const [foundScopeId] = matchingBinding;
    await writeScopeIdToMetadata(foundScopeId);
    return { scopeId: foundScopeId, isNew: false };
  }

  // 情况 3：创建新 scopeId
  return await createNewScope(ownerKey, chatId);
}

/**
 * 创建新 scope
 */
async function createNewScope(ownerKey: string, chatId: string): Promise<{ scopeId: string; isNew: boolean }> {
  const scopeId = crypto.randomUUID();
  const binding: ScopeBinding = {
    ownerKey,
    chatId,
    displayName: '',
    updatedAt: new Date().toISOString(),
  };

  await commitIndex((index) => {
    index.scopeBindings[scopeId] = binding;
    index.scopeFiles[scopeId] = {};
    return index;
  });

  await writeScopeIdToMetadata(scopeId);
  return { scopeId, isNew: true };
}

/**
 * Branch/Checkpoint：创建新 scopeId 并复制数据
 */
async function createBranchScope(
  originalScopeId: string,
  ownerKey: string,
  chatId: string,
): Promise<{ scopeId: string; isNew: boolean }> {
  const newScopeId = crypto.randomUUID();
  const index = await loadIndex();

  const originalFiles = index.scopeFiles[originalScopeId] ?? {};

  await commitIndex((idx) => {
    idx.scopeBindings[newScopeId] = {
      ownerKey,
      chatId,
      displayName: '',
      updatedAt: new Date().toISOString(),
    };
    idx.scopeFiles[newScopeId] = { ...originalFiles };
    return idx;
  });

  await writeScopeIdToMetadata(newScopeId);
  return { scopeId: newScopeId, isNew: true };
}

/**
 * 写入 scopeId 到聊天 metadata
 */
async function writeScopeIdToMetadata(scopeId: string): Promise<void> {
  // 使用 SillyTavern 的 saveMetadata 写入
  try {
    const sm = (window as unknown as Record<string, unknown>).saveMetadata as
      | (() => Promise<void>)
      | undefined;
    if (sm) {
      _.set(extension_settings, 'sillytavernPhone.scopeId', scopeId);
      await sm();
    }
  } catch {
    // 至少保留在 settings 中
    writeToSettings('scopeId', scopeId);
  }
}

// Forward reference for writeToSettings
import { writeToSettings } from './file-storage';
