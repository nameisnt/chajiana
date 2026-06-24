<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!thread" class="text-center text-secondary py-8">帖子不存在</div>
    <div v-else>
      <!-- 主帖 -->
      <div class="mb-3">
        <p class="text-xs text-secondary mb-1">
          <span>{{ boardName }}</span>
          <span class="mx-1">·</span>
          <span>作者: {{ thread.author }}</span>
          <span class="mx-1">·</span>
          <span>{{ formatDate(thread.createdAt) }}</span>
        </p>
        <h2 class="text-lg font-bold mb-2">{{ thread.title }}</h2>
        <div class="pc-glass-card p-4 mb-2">
          <div class="text-sm whitespace-pre-wrap leading-relaxed">{{ thread.content }}</div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button class="pc-btn pc-btn-secondary text-sm" @click="copyContent(thread.content)">复制主帖</button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="toggleFavorite">
            <i :class="thread.favorite ? 'fa-solid' : 'fa-regular'" class="fa-star mr-1"></i>
            {{ thread.favorite ? '已收藏' : '收藏' }}
          </button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="goReply">回复</button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="deleteThread">删除</button>
        </div>
      </div>

      <!-- 回复列表 -->
      <div v-if="thread.replies.length > 0" class="mt-4">
        <h3 class="text-sm font-semibold mb-2">
          回复 ({{ thread.replies.length }})
        </h3>
        <div class="flex flex-col gap-2">
          <div
            v-for="reply in topLevelReplies"
            :key="reply.id"
            class="flex flex-col gap-2"
          >
            <!-- 顶层回复 -->
            <div :class="['pc-glass-card p-3', nestedReplies[reply.id]?.length ? '' : '']">
              <p class="text-xs text-secondary mb-1">{{ reply.author }} · {{ formatDate(reply.createdAt) }}</p>
              <div class="text-sm whitespace-pre-wrap">{{ reply.content }}</div>
              <button class="text-xs text-[var(--pc-accent)] mt-1" @click="copyContent(reply.content)">复制</button>
            </div>

            <!-- 嵌套回复（缩进） -->
            <div v-if="nestedReplies[reply.id]?.length" class="ml-4 flex flex-col gap-2 border-l-2 border-[var(--pc-border)] pl-3">
              <div
                v-for="nested in nestedReplies[reply.id]"
                :key="nested.id"
                class="pc-glass-card p-3"
              >
                <p class="text-xs text-secondary mb-1">
                  {{ nested.author }} · {{ formatDate(nested.createdAt) }}
                  <span class="text-[var(--pc-accent)] ml-1">回复 {{ getParentAuthor(nested.parentReplyId) }}</span>
                </p>
                <div class="text-sm whitespace-pre-wrap">{{ nested.content }}</div>
                <button class="text-xs text-[var(--pc-accent)] mt-1" @click="copyContent(nested.content)">复制</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import { upsertSnapshot, deleteSnapshot } from '@/repositories/favorite-snapshots';
import type { ForumScopeData, ForumThread, ForumReply } from '@/types';

const navStore = useNavigationStore();
const threadId = navStore.currentNav?.params?.threadId;
const thread = ref<ForumThread | null>(null);
const boardName = ref('');
const loading = ref(true);

function formatDate(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

interface ReplyNode extends ForumReply {
  children?: ReplyNode[];
}

// Build a map of children by parentReplyId
const nestedReplies = computed<Record<string, ForumReply[]>>(() => {
  if (!thread.value) return {};
  const map: Record<string, ForumReply[]> = {};
  for (const reply of thread.value.replies) {
    if (reply.parentReplyId) {
      if (!map[reply.parentReplyId]) {
        map[reply.parentReplyId] = [];
      }
      map[reply.parentReplyId].push(reply);
    }
  }
  return map;
});

// Top-level replies (no parentReplyId)
const topLevelReplies = computed<ForumReply[]>(() => {
  if (!thread.value) return [];
  return thread.value.replies.filter((r) => !r.parentReplyId);
});

function getParentAuthor(parentId?: string) {
  if (!parentId || !thread.value) return '';
  const parent = thread.value.replies.find((r) => r.id === parentId);
  return parent?.author ?? '';
}

async function load() {
  if (!threadId) return;
  loading.value = true;
  const data = await loadChatData<ForumScopeData>('current', 'forum');
  for (const board of data?.boards ?? []) {
    const found = board.threads.find((t) => t.id === threadId);
    if (found) {
      thread.value = found;
      boardName.value = board.name;
      break;
    }
  }
  loading.value = false;
}

async function copyContent(text: string) {
  await navigator.clipboard.writeText(text);
  toastr?.success('已复制');
}

async function toggleFavorite() {
  if (!thread.value) return;
  thread.value.favorite = !thread.value.favorite;
  thread.value.updatedAt = new Date().toISOString();

  const data = await loadChatData<ForumScopeData>('current', 'forum');
  if (data) {
    for (const board of data.boards) {
      const idx = board.threads.findIndex((t) => t.id === threadId);
      if (idx >= 0) {
        board.threads[idx] = { ...thread.value };
        break;
      }
    }
    await saveChatData('current', 'forum', data);
  }

  if (thread.value.favorite) {
    await upsertSnapshot('current', 'forum', thread.value.id, thread.value.title, {
      type: 'forum',
      item: thread.value,
    });
  } else {
    await deleteSnapshot('current', 'forum', thread.value.id);
  }
}

async function deleteThread() {
  if (!thread.value || !confirm('确定删除此帖子吗？所有回复将被删除。')) return;
  const data = await loadChatData<ForumScopeData>('current', 'forum');
  if (data) {
    for (const board of data.boards) {
      board.threads = board.threads.filter((t) => t.id !== threadId);
    }
    await saveChatData('current', 'forum', data);
  }
  if (thread.value.favorite) {
    await deleteSnapshot('current', 'forum', thread.value.id);
  }
  navStore.back();
}

function goReply() {
  const bId = thread.value?.boardId;
  if (bId) {
    navStore.push(`generate/${bId}`, '回复', { mode: 'continueReply', threadId: thread.value!.id });
  }
}

onMounted(() => load());
</script>
