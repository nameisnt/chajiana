<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">聊天统计</h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>

    <!-- Stats view -->
    <div v-else class="flex flex-col gap-4">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="pc-glass-card p-3 text-center">
          <p class="text-2xl font-bold">{{ stats.totalMessages }}</p>
          <p class="text-xs text-secondary">总消息数</p>
        </div>
        <div class="pc-glass-card p-3 text-center">
          <p class="text-2xl font-bold">{{ stats.totalChars.toLocaleString() }}</p>
          <p class="text-xs text-secondary">总字符数</p>
        </div>
        <div class="pc-glass-card p-3 text-center">
          <p class="text-2xl font-bold text-blue-300">{{ stats.userMessages }}</p>
          <p class="text-xs text-secondary">用户消息 ({{ userPercent }}%)</p>
        </div>
        <div class="pc-glass-card p-3 text-center">
          <p class="text-2xl font-bold text-green-300">{{ stats.aiMessages }}</p>
          <p class="text-xs text-secondary">AI 消息 ({{ aiPercent }}%)</p>
        </div>
      </div>

      <!-- Average chars per message -->
      <div class="pc-glass-card p-3 text-center">
        <p class="text-lg font-semibold">{{ avgCharsPerMsg }}</p>
        <p class="text-xs text-secondary">平均每条消息字符数</p>
      </div>

      <!-- Per-message char distribution -->
      <div class="pc-glass-card p-4">
        <h3 class="font-semibold text-sm mb-3">每条消息字符分布</h3>
        <div v-if="stats.perMessageChars.length === 0" class="text-xs text-secondary py-2">
          无数据
        </div>
        <!-- Bar chart -->
        <div v-else class="flex flex-col gap-1 max-h-64 overflow-y-auto">
          <div
            v-for="item in stats.perMessageChars"
            :key="item.index"
            class="flex items-center gap-2 text-xs"
          >
            <span class="w-8 text-right text-secondary shrink-0">#{{ item.index }}</span>
            <div
              class="h-4 rounded-r"
              :style="barStyle(item.chars)"
            ></div>
            <span class="shrink-0">{{ item.chars }}</span>
          </div>
        </div>
      </div>

      <!-- Role stats table -->
      <div class="pc-glass-card p-4">
        <h3 class="font-semibold text-sm mb-3">角色发言统计</h3>
        <div v-if="stats.roleStats.length === 0" class="text-xs text-secondary py-2">
          无数据
        </div>
        <div v-else class="flex flex-col gap-1">
          <div
            v-for="rs in stats.roleStats"
            :key="rs.name"
            class="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0"
          >
            <span class="truncate mr-2">{{ rs.name }}</span>
            <span class="text-secondary shrink-0">{{ rs.count }} 条</span>
          </div>
        </div>
      </div>

      <!-- Refresh -->
      <button class="pc-btn pc-btn-secondary text-sm" @click="refresh">
        <i class="fa-solid fa-rotate mr-1"></i> 刷新统计
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import type { ChatStats } from '@/types';

const navStore = useNavigationStore();

interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  is_system?: boolean;
  is_user?: boolean;
  message: string;
  data: Record<string, unknown>;
  extra: Record<string, unknown>;
}

const loading = ref(true);
const stats = ref<ChatStats>({
  totalMessages: 0,
  userMessages: 0,
  aiMessages: 0,
  totalChars: 0,
  perMessageChars: [],
  roleStats: [],
});

const userPercent = computed(() => {
  if (stats.value.totalMessages === 0) return '0';
  return ((stats.value.userMessages / stats.value.totalMessages) * 100).toFixed(1);
});

const aiPercent = computed(() => {
  if (stats.value.totalMessages === 0) return '0';
  return ((stats.value.aiMessages / stats.value.totalMessages) * 100).toFixed(1);
});

const avgCharsPerMsg = computed(() => {
  if (stats.value.totalMessages === 0) return '0';
  return Math.round(stats.value.totalChars / stats.value.totalMessages).toLocaleString();
});

function barStyle(chars: number): Record<string, string> {
  const maxChars = Math.max(...stats.value.perMessageChars.map((i) => i.chars), 1);
  const ratio = chars / maxChars;
  const hue = 210 + (1 - ratio) * 40; // blue to cyan
  return {
    width: `${Math.max(ratio * 100, 2)}%`,
    backgroundColor: `hsl(${hue}, 70%, 50%)`,
  };
}

function computeStats(messages: ChatMessage[]): ChatStats {
  // Filter out hidden and system messages
  const visible = messages.filter(
    (m) => !m.is_hidden && m.role !== 'system' && !m.is_system,
  );

  const totalMessages = visible.length;
  const userMessages = visible.filter((m) => m.is_user === true || m.role === 'user').length;
  const aiMessages = visible.filter(
    (m) => (m.is_user === false || m.role === 'assistant') && m.role !== 'system',
  ).length;
  const totalChars = visible.reduce((sum, m) => sum + (m.message?.length ?? 0), 0);

  // Per-message char distribution
  const perMessageChars = visible.map((m) => ({
    index: m.message_id,
    chars: m.message?.length ?? 0,
  }));

  // Role stats: group by name
  const roleMap = new Map<string, number>();
  for (const m of visible) {
    const key = m.name || m.role;
    roleMap.set(key, (roleMap.get(key) ?? 0) + 1);
  }
  const roleStats = Array.from(roleMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalMessages,
    userMessages,
    aiMessages,
    totalChars,
    perMessageChars,
    roleStats,
  };
}

async function refresh() {
  loading.value = true;
  try {
    const lastId = window.TavernHelper?.util?.getLastMessageId() ?? -1;
    if (lastId < 0) {
      stats.value = {
        totalMessages: 0,
        userMessages: 0,
        aiMessages: 0,
        totalChars: 0,
        perMessageChars: [],
        roleStats: [],
      };
      loading.value = false;
      return;
    }

    const messages = (window.TavernHelper as any).getChatMessages(
      `0-${lastId}`,
    ) as unknown as ChatMessage[];

    stats.value = computeStats(messages);
  } catch (e) {
    console.error('[聊天统计] 获取聊天消息失败:', e);
    toastr?.error('获取统计数据失败');
  }
  loading.value = false;
}

let chatChangedHandler: (() => void) | null = null;

onMounted(() => {
  refresh();

  // Listen for chat changes
  if (typeof eventSource !== 'undefined') {
    chatChangedHandler = () => {
      refresh();
    };
    eventSource.on('CHAT_CHANGED', chatChangedHandler);
  }
});

onUnmounted(() => {
  if (typeof eventSource !== 'undefined' && chatChangedHandler) {
    eventSource.removeListener('CHAT_CHANGED', chatChangedHandler);
    chatChangedHandler = null;
  }
});
</script>
