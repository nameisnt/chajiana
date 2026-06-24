<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <!-- 工具栏 -->
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 class="text-lg font-bold truncate flex-1 min-w-0">{{ chatFileName }}</h2>
        <button class="pc-btn pc-btn-secondary text-sm" @click="refresh">
          <i class="fa-solid fa-rotate mr-1"></i>刷新
        </button>
      </div>

      <!-- 正则规则区 -->
      <div class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">标题规则</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          <input
            v-model="settings.title.find"
            class="pc-input flex-1 min-w-[80px]"
            placeholder="查找（正则）"
          />
          <input
            v-model="settings.title.replace"
            class="pc-input flex-1 min-w-[80px]"
            placeholder="替换"
          />
          <input
            v-model="settings.title.flags"
            class="pc-input"
            style="max-width: 80px"
            placeholder="flags"
          />
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">正文规则</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          <input
            v-model="settings.body.find"
            class="pc-input flex-1 min-w-[80px]"
            placeholder="查找（正则）"
          />
          <input
            v-model="settings.body.replace"
            class="pc-input flex-1 min-w-[80px]"
            placeholder="替换"
          />
          <input
            v-model="settings.body.flags"
            class="pc-input"
            style="max-width: 80px"
            placeholder="flags"
          />
        </div>

        <!-- 显示隐藏 -->
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" v-model="settings.showHiddenAssistantMessages" />
          显示隐藏AI楼层
        </label>
      </div>

      <!-- 消息统计 -->
      <p class="text-xs text-secondary mb-2">
        共 {{ filteredMessages.length }} 条AI消息（总计 {{ allMessages.length }} 条消息）
      </p>

      <!-- 消息列表 -->
      <div v-if="filteredMessages.length === 0" class="text-center text-secondary py-8">
        没有符合条件的消息
      </div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="msg in displayedMessages"
          :key="msg.id"
          class="pc-glass-card p-4"
        >
          <h3 class="font-semibold text-sm mb-2 text-[var(--pc-accent)]">
            {{ applyRegex(msg.title || `第${msg.floorNumber}楼`, settings.title) }}
          </h3>
          <div class="text-sm whitespace-pre-wrap leading-relaxed">
            {{ applyRegex(msg.body || msg.originalContent, settings.body) }}
          </div>
          <p class="text-xs text-secondary mt-2">
            楼层 #{{ msg.floorNumber }}
            <span v-if="msg.name"> · {{ msg.name }}</span>
          </p>
        </div>
      </div>

      <!-- 加载更多提示 -->
      <div v-if="hasMore" class="text-center py-4">
        <button class="pc-btn pc-btn-secondary text-sm" @click="loadMore">
          加载更多（当前显示 {{ displayCount }} / {{ filteredMessages.length }}）
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import type { ChatReaderRegexRule, ChatReaderSettings } from '@/types';

interface ChatMessage {
  id: number;
  is_user?: boolean;
  is_system?: boolean;
  mes?: string;
  name?: string;
  [key: string]: unknown;
}

interface DisplayMessage {
  id: number;
  floorNumber: number;
  name?: string;
  title: string;
  body: string;
  originalContent: string;
  isHidden?: boolean;
}

const navStore = useNavigationStore();
const chatFileName = decodeURIComponent(navStore.currentNav?.params?.chatFileName ?? '');

const loading = ref(true);
const allMessages = ref<ChatMessage[]>([]);

const settings = reactive<ChatReaderSettings>({
  title: { find: '', replace: '', flags: 'g' },
  body: { find: '', replace: '', flags: 'g' },
  showHiddenAssistantMessages: false,
});

// Simple virtual-scroll pagination
const displayCount = ref(20);
const pageSize = 20;

function applyRegex(text: string, rule: ChatReaderRegexRule): string {
  if (!rule.find) return text;
  try {
    const regex = new RegExp(rule.find, rule.flags);
    return text.replace(regex, rule.replace);
  } catch {
    return text;
  }
}

const filteredMessages = computed<DisplayMessage[]>(() => {
  const result: DisplayMessage[] = [];
  let floorNumber = 0;

  for (const msg of allMessages.value) {
    floorNumber++;

    const isUser = Boolean(msg.is_user);
    const isSystem = Boolean(msg.is_system);

    // Filter: only AI messages, not system
    if (isUser || isSystem) continue;

    // Check if hidden (is_hidden or similar field)
    const isHidden = Boolean(msg.is_hidden) || Boolean((msg as Record<string, unknown>).hidden);

    // Skip hidden by default
    if (isHidden && !settings.showHiddenAssistantMessages) continue;

    const originalContent = String(msg.mes ?? '');
    const name = msg.name;

    result.push({
      id: msg.id ?? floorNumber,
      floorNumber,
      name,
      title: `第${floorNumber}楼`,
      body: originalContent,
      originalContent,
      isHidden,
    });
  }

  return result;
});

const displayedMessages = computed(() => {
  return filteredMessages.value.slice(0, displayCount.value);
});

const hasMore = computed(() => {
  return displayCount.value < filteredMessages.value.length;
});

function loadMore() {
  displayCount.value = Math.min(displayCount.value + pageSize, filteredMessages.value.length);
}

async function load() {
  if (!chatFileName) {
    loading.value = false;
    return;
  }
  loading.value = true;
  displayCount.value = pageSize;
  try {
    const messages = await (window.TavernHelper as any).getChatHistoryDetail([
      { file_name: chatFileName },
    ]);
    allMessages.value = Array.isArray(messages) ? messages : [];
  } catch (err) {
    console.error('[阅读聊天] 加载消息失败:', err);
    toastr?.error('加载聊天消息失败');
    allMessages.value = [];
  }
  loading.value = false;
}

function refresh() {
  load();
}

onMounted(() => load());

// Clear cache when leaving
onUnmounted(() => {
  allMessages.value = [];
  displayCount.value = pageSize;
});
</script>
