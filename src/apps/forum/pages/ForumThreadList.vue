<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold truncate flex-1 mr-2">{{ board?.name }}</h2>
        <div class="flex items-center gap-1">
          <button class="pc-btn text-sm" @click="goGenerate('newThread')">发帖</button>
        </div>
      </div>

      <!-- 搜索和排序 -->
      <input v-model="search" class="pc-input mb-3" placeholder="搜索标题..." />

      <div class="flex gap-2 mb-3 flex-wrap">
        <button
          v-for="s in sortOptions"
          :key="s.key"
          class="text-xs pc-btn pc-btn-secondary"
          :class="{ '!bg-[var(--pc-accent)] !text-white': sortMode === s.key }"
          @click="sortMode = s.key"
        >
          {{ s.label }}
        </button>
      </div>

      <div v-if="filteredThreads.length === 0" class="text-center text-secondary py-8">
        <p v-if="board?.threads.length === 0">暂无帖子，来发第一个吧</p>
        <p v-else>无匹配帖子</p>
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="thread in filteredThreads"
          :key="thread.id"
          class="pc-glass-card p-3 cursor-pointer"
          @click="openDetail(thread.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ thread.title }}</p>
              <p class="text-xs text-secondary">
                <span>作者: {{ thread.author }}</span>
                <span class="mx-2">|</span>
                <span>{{ thread.replies.length }} 回复</span>
                <span class="mx-2">|</span>
                <span>{{ formatDate(thread.updatedAt) }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2 ml-2 shrink-0">
              <i v-if="thread.favorite" class="fa-solid fa-star text-yellow-400 text-xs"></i>
              <i class="fa-solid fa-chevron-right text-secondary text-xs"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData } from '@/repositories/data-repository';
import type { ForumScopeData, ForumThread } from '@/types';

const navStore = useNavigationStore();
const boardId = navStore.currentNav?.params?.boardId;
const board = ref<ForumScopeData['boards'][0] | null>(null);
const threads = ref<ForumThread[]>([]);
const loading = ref(true);
const search = ref('');

const sortOptions = [
  { key: 'latestReply' as const, label: '最新回复' },
  { key: 'latestPost' as const, label: '最新发帖' },
  { key: 'hot' as const, label: '最热' },
  { key: 'favorites' as const, label: '收藏' },
];
const sortMode = ref<'latestReply' | 'latestPost' | 'hot' | 'favorites'>('latestReply');

const filteredThreads = computed(() => {
  let result = threads.value.filter((t) => {
    if (!search.value) return true;
    const q = search.value.toLowerCase();
    return t.title.toLowerCase().includes(q)
      || t.author.toLowerCase().includes(q);
  });

  result = [...result].sort((a, b) => {
    switch (sortMode.value) {
      case 'latestPost':
        return b.createdAt.localeCompare(a.createdAt);
      case 'hot':
        return b.replies.length - a.replies.length;
      case 'favorites':
        return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)
          || b.updatedAt.localeCompare(a.updatedAt);
      case 'latestReply':
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
  return result;
});

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

async function load() {
  if (!boardId) return;
  loading.value = true;
  const data = await loadChatData<ForumScopeData>('current', 'forum');
  board.value = data?.boards.find((b) => b.id === boardId) ?? null;
  threads.value = board.value?.threads ?? [];
  loading.value = false;
}

function openDetail(threadId: string) {
  navStore.push(`detail/${threadId}`, '帖子详情');
}

function goGenerate(mode: string) {
  navStore.push(`generate/${boardId}`, mode === 'newThread' ? '发帖' : '回复', { mode });
}

onMounted(() => load());
</script>
