import type { SourceSelection, SourceMode } from '@/types';

/**
 * 解析来源楼层选择
 */
export function resolveSourceSelection(
  scopeId: string,
  mode: SourceMode,
  ranges: Array<{ start: number; end: number }>,
  messageIds: number[],
): SourceSelection | null {
  const lastMessageId = window.TavernHelper?.util.getLastMessageId() ?? -1;
  if (lastMessageId < 0) return null;

  let resolvedRanges: Array<{ start: number; end: number }> = [];
  let resolvedIds: number[] = [];
  let label = '';

  switch (mode) {
    case 'latest': {
      const latest = getLatestVisibleMessage();
      if (latest === null) return null;
      resolvedIds = [latest];
      resolvedRanges = [{ start: latest, end: latest }];
      label = `最新楼层 #${latest}`;
      break;
    }
    case 'fromStart': {
      const end = ranges[0]?.end ?? lastMessageId;
      resolvedRanges = [{ start: 0, end }];
      label = `0 ~ ${end}`;
      break;
    }
    case 'all': {
      resolvedRanges = [{ start: 0, end: lastMessageId }];
      label = '全部楼层';
      break;
    }
    case 'single': {
      const id = messageIds[0] ?? ranges[0]?.start ?? lastMessageId;
      resolvedIds = [id];
      resolvedRanges = [{ start: id, end: id }];
      label = `#${id}`;
      break;
    }
    case 'recent': {
      const n = ranges[0]?.end ?? ranges[0]?.start ?? 5;
      const start = Math.max(0, lastMessageId - n + 1);
      resolvedRanges = [{ start, end: lastMessageId }];
      label = `最近 ${n} 楼`;
      break;
    }
    case 'range': {
      resolvedRanges = ranges;
      label = ranges.map((r) => `${r.start}~${r.end}`).join(', ');
      break;
    }
  }

  // 检查范围中是否有可见楼层
  const visibleMessages = getVisibleMessagesInRanges(resolvedRanges);
  if (visibleMessages.length === 0) return null;

  return {
    scopeId,
    chatIdAtGeneration: getCurrentChatId(),
    mode,
    ranges: resolvedRanges,
    messageIds: resolvedIds.length > 0 ? resolvedIds : visibleMessages,
    label,
    sortKey: Date.now(),
  };
}

function getLatestVisibleMessage(): number | null {
  const messages = window.TavernHelper?.chat_message.getChatMessages('-5', {
    role: 'all',
    hide_state: 'unhidden',
  });
  if (!messages || messages.length === 0) return null;
  return messages[messages.length - 1].message_id;
}

function getVisibleMessagesInRanges(ranges: Array<{ start: number; end: number }>): number[] {
  const result: number[] = [];
  for (const range of ranges) {
    const msgs = window.TavernHelper?.chat_message.getChatMessages(
      `${range.start}-${range.end}`,
      { hide_state: 'unhidden' },
    );
    if (msgs) {
      for (const m of msgs) {
        result.push(m.message_id);
      }
    }
  }
  return result;
}

function getCurrentChatId(): string {
  try {
    // eslint-disable-next-line
    const context = (window as any).SillyTavern?.getContext?.();
    return context?.chatId ?? String(context?.chat?.chat_id ?? 'unknown');
  } catch {
    return 'unknown';
  }
}
