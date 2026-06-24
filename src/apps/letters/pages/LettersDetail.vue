<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!entry" class="text-center text-secondary py-8">信件不存在</div>
    <div v-else>
      <!-- 导航按钮 -->
      <div class="flex items-center justify-between mb-2">
        <button
          class="text-xs pc-btn pc-btn-secondary"
          :disabled="!hasPrev"
          @click="goPrev"
        >
          上一封
        </button>
        <button
          class="text-xs pc-btn pc-btn-secondary"
          :disabled="!hasNext"
          @click="goNext"
        >
          下一封
        </button>
      </div>

      <h2 class="text-lg font-bold mb-1">{{ entry.title }}</h2>
      <p class="text-xs text-secondary mb-1">
        {{ entry.sender.name }} → {{ entry.receiver.name }}
        <span class="ml-2 px-1 py-0.5 rounded text-xs" :class="formatBadgeClass(entry.format)">
          {{ formatLabel(entry.format) }}
        </span>
      </p>
      <p class="text-xs text-secondary mb-3">{{ formatDate(entry.createdAt) }}</p>

      <div class="pc-glass-card p-4 mb-3">
        <div class="text-sm whitespace-pre-wrap">{{ entry.content }}</div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button class="pc-btn pc-btn-secondary text-sm" @click="copyContent">复制</button>
        <button class="pc-btn pc-btn-secondary text-sm" @click="toggleFavorite">
          <i :class="entry.favorite ? 'fa-solid' : 'fa-regular'" class="fa-star mr-1"></i>
          {{ entry.favorite ? '已收藏' : '收藏' }}
        </button>
        <button class="pc-btn pc-btn-secondary text-sm" @click="deleteEntry">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import { upsertSnapshot, deleteSnapshot } from '@/repositories/favorite-snapshots';
import type { LettersScopeData, LettersEntry, LetterFormat } from '@/types';

const navStore = useNavigationStore();
const entryId = navStore.currentNav?.params?.entryId;
const entry = ref<LettersEntry | null>(null);
const entryIndex = ref(-1);
const totalInBook = ref(0);
const loading = ref(true);

// 缓存当前册子的条目列表以支持上下导航
const cachedBookEntries = ref<LettersEntry[]>([]);

const hasPrev = computed(() => entryIndex.value > 0);
const hasNext = computed(() => entryIndex.value < totalInBook.value - 1);

function formatLabel(fmt: LetterFormat): string {
  const map: Record<LetterFormat, string> = { formal: '正式', note: '便条', sms: '短信', email: '邮件' };
  return map[fmt];
}

function formatBadgeClass(fmt: LetterFormat): string {
  const map: Record<LetterFormat, string> = {
    formal: 'bg-blue-100 text-blue-700',
    note: 'bg-yellow-100 text-yellow-700',
    sms: 'bg-green-100 text-green-700',
    email: 'bg-purple-100 text-purple-700',
  };
  return map[fmt];
}

function formatDate(iso: string) { return iso.slice(0, 10); }

async function load() {
  if (!entryId) return;
  loading.value = true;
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  for (const book of data?.books ?? []) {
    const idx = book.entries.findIndex((e) => e.id === entryId);
    if (idx >= 0) {
      entry.value = book.entries[idx];
      entryIndex.value = idx;
      totalInBook.value = book.entries.length;
      cachedBookEntries.value = book.entries;
      break;
    }
  }
  loading.value = false;
}

function goPrev() {
  if (entryIndex.value <= 0) return;
  const newIdx = entryIndex.value - 1;
  const prevEntry = cachedBookEntries.value[newIdx];
  if (!prevEntry) return;
  navStore.replace(`detail/${prevEntry.id}`, '信件详情');
  entry.value = prevEntry;
  entryIndex.value = newIdx;
}

function goNext() {
  if (entryIndex.value >= totalInBook.value - 1) return;
  const newIdx = entryIndex.value + 1;
  const nextEntry = cachedBookEntries.value[newIdx];
  if (!nextEntry) return;
  navStore.replace(`detail/${nextEntry.id}`, '信件详情');
  entry.value = nextEntry;
  entryIndex.value = newIdx;
}

async function copyContent() {
  if (!entry.value) return;
  await navigator.clipboard.writeText(entry.value.content);
  toastr?.success('已复制');
}

async function toggleFavorite() {
  if (!entry.value) return;
  entry.value.favorite = !entry.value.favorite;
  entry.value.updatedAt = new Date().toISOString();
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  if (data) {
    for (const book of data.books) {
      const idx = book.entries.findIndex((e) => e.id === entryId);
      if (idx >= 0) { book.entries[idx] = { ...entry.value }; break; }
    }
    await saveChatData('current', 'letters', data);
  }
  if (entry.value.favorite) {
    await upsertSnapshot('current', 'letters', entry.value.id, entry.value.title, { type: 'letters', item: entry.value });
  } else {
    await deleteSnapshot('current', 'letters', entry.value.id);
  }
}

async function deleteEntry() {
  if (!entry.value || !confirm('确定删除？')) return;
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  if (data) {
    for (const book of data.books) {
      book.entries = book.entries.filter((e) => e.id !== entryId);
    }
    await saveChatData('current', 'letters', data);
  }
  if (entry.value.favorite) await deleteSnapshot('current', 'letters', entry.value.id);
  navStore.back();
}

onMounted(() => load());
</script>
