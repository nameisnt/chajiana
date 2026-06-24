import type { PendingVisibilityRecovery } from '@/types';
import { getSettings, setSettings } from '@/util/settings';

/**
 * 计算 SHA-256 哈希
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 快照当前所有楼层的状态
 */
function snapshotMessages(): Array<{
  messageId: number;
  isHidden: boolean;
  role: string;
  name: string;
}> {
  const lastId = (window.TavernHelper as any).getLastMessageId();
  const messages = (window.TavernHelper as any).getChatMessages(`0-${lastId}`, {
    include_swipes: true,
  });

  return messages.map((m) => {
    const swiped = m as unknown as {
      message_id: number;
      is_hidden: boolean;
      role: string;
      name: string;
      swipes: string[];
    };
    return {
      messageId: swiped.message_id,
      isHidden: swiped.is_hidden,
      role: swiped.role,
      name: swiped.name,
    };
  });
}

/**
 * 创建崩溃恢复日志
 */
async function createRecoveryLog(
  scopeId: string,
  generationId: string,
  messages: Array<{ messageId: number; isHidden: boolean; role: string; name: string }>,
): Promise<PendingVisibilityRecovery> {
  const entries = await Promise.all(
    messages.map(async (m) => ({
      messageId: m.messageId,
      isHidden: m.isHidden,
      role: m.role as 'system' | 'assistant' | 'user',
      name: m.name,
      contentHash: await sha256(`${m.role}${m.name}`),
    })),
  );

  return {
    scopeId,
    generationId,
    createdAt: new Date().toISOString(),
    messages: entries,
  };
}

/**
 * 保存恢复日志到 extension_settings
 */
function saveRecoveryLog(recovery: PendingVisibilityRecovery): void {
  const current =
    (getSettings('sillytavernPhone.pendingVisibilityRecoveries') as Record<
      string,
      PendingVisibilityRecovery
    >) ?? {};
  current[recovery.scopeId] = recovery;
  setSettings('sillytavernPhone.pendingVisibilityRecoveries', current);
}

/**
 * 清除恢复日志
 */
function clearRecoveryLog(scopeId: string): void {
  const current =
    (getSettings('sillytavernPhone.pendingVisibilityRecoveries') as Record<
      string,
      PendingVisibilityRecovery
    >) ?? {};
  delete current[scopeId];
  setSettings('sillytavernPhone.pendingVisibilityRecoveries', current);
}

/**
 * 临时隐藏来源范围外的可见楼层
 */
async function hideNonSourceMessages(
  sourceIds: number[],
): Promise<Array<{ messageId: number; wasVisible: boolean }>> {
  const lastId = (window.TavernHelper as any).getLastMessageId();
  const allMessages = (window.TavernHelper as any).getChatMessages(`0-${lastId}`);

  const sourceSet = new Set(sourceIds);
  const toHide: Array<{ message_id: number; is_hidden: boolean }> = [];

  for (const m of allMessages) {
    if (!m.is_hidden && !sourceSet.has(m.message_id)) {
      toHide.push({ message_id: m.message_id, is_hidden: true });
    }
  }

  if (toHide.length === 0) return [];

  await (window.TavernHelper as any).setChatMessages(toHide, { refresh: 'none' });

  return toHide.map((m) => ({ messageId: m.message_id, wasVisible: true }));
}

/**
 * 恢复楼层原始隐藏状态
 */
async function restoreMessages(
  snapshot: Array<{ messageId: number; isHidden: boolean }>,
): Promise<void> {
  const restoreData = snapshot.map((s) => ({
    message_id: s.messageId,
    is_hidden: s.isHidden,
  }));

  await (window.TavernHelper as any).setChatMessages(restoreData, { refresh: 'none' });

  // saveChat is called externally via SillyTavern API
  if (typeof (window as unknown as Record<string, unknown>).saveChat === 'function') {
    await ((window as unknown as Record<string, unknown>).saveChat as () => Promise<void>)();
  }
}

/**
 * 验证恢复后的楼层状态与快照一致
 */
function verifyRestoredState(
  snapshot: Array<{ messageId: number; isHidden: boolean }>,
): boolean {
  const lastId = (window.TavernHelper as any).getLastMessageId();
  const current = (window.TavernHelper as any).getChatMessages(`0-${lastId}`);

  for (const s of snapshot) {
    const msg = current.find((m) => m.message_id === s.messageId);
    if (!msg) continue;
    if (msg.is_hidden !== s.isHidden) return false;
  }
  return true;
}

/**
 * 来源楼层隐藏事务
 * 返回 cleanup 函数，调用方必须在 finally 中调用
 */
export async function beginVisibilityTransaction(
  scopeId: string,
  generationId: string,
  sourceIds: number[],
): Promise<{
  cleanup: () => Promise<void>;
  snapshot: Array<{ messageId: number; isHidden: boolean }>;
}> {
  // 1. 快照所有楼层
  const allMessages = snapshotMessages();
  const snapshot = allMessages.map((m) => ({
    messageId: m.messageId,
    isHidden: m.isHidden,
  }));

  // 2. 检查来源是否覆盖所有可见楼层
  const visibleIds = allMessages.filter((m) => !m.isHidden).map((m) => m.messageId);
  const sourceSet = new Set(sourceIds);
  const coversAll = visibleIds.every((id) => sourceSet.has(id));

  // 3. 创建恢复日志（即使不需要隐藏）
  const recovery = await createRecoveryLog(scopeId, generationId, allMessages);

  if (!coversAll) {
    // 持久化恢复日志
    saveRecoveryLog(recovery);

    // 4. 隐藏非来源楼层
    await hideNonSourceMessages(sourceIds);
  }

  return {
    snapshot,
    cleanup: async () => {
      try {
        // 恢复楼层
        if (!coversAll) {
          await restoreMessages(snapshot);

          // 核验
          const valid = verifyRestoredState(snapshot);
          if (!valid) {
            console.warn('[酒馆手机] 楼层恢复后状态不一致，保留恢复日志');
            return;
          }
        }

        // 清除恢复日志
        clearRecoveryLog(scopeId);
      } catch (err) {
        console.error('[酒馆手机] 恢复楼层失败:', err);
      }
    },
  };
}

/**
 * 检查并自动恢复崩溃的日志
 */
export async function checkAndRecoverPending(scopeId: string): Promise<boolean> {
  const pendings =
    (getSettings('sillytavernPhone.pendingVisibilityRecoveries') as Record<
      string,
      PendingVisibilityRecovery
    >) ?? {};

  const recovery = pendings[scopeId];
  if (!recovery) return false;

  // 尝试恢复
  try {
    await restoreMessages(
      recovery.messages.map((m) => ({
        messageId: m.messageId,
        isHidden: m.isHidden,
      })),
    );
    clearRecoveryLog(scopeId);
    return true;
  } catch {
    console.warn('[酒馆手机] 崩溃恢复失败，保留日志供人工处理');
    return false;
  }
}
