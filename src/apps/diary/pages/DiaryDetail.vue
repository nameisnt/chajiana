<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!entry" class="text-center text-secondary py-8">条目不存在</div>
    <div v-else>
      <h2 class="text-lg font-bold mb-1">{{ entry.title }}</h2>
      <p class="text-xs text-secondary mb-2">
        {{ entry.perspective.name }} · {{ formatDate(entry.createdAt) }}
        <span v-if="entry.kind === 'read-reaction'">· 📖 阅读反应</span>
      </p>
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
import type { DiaryScopeData, DiaryEntry } from '@/types';

const navStore = useNavigationStore();
const entryId = navStore.currentNav?.params?.entryId;
const entry = ref<DiaryEntry | null>(null);
const loading = ref(true);

function formatDate(iso: string) { return iso.slice(0, 10); }

async function load() {
  if (!entryId) return;
  loading.value = true;
  const data = await loadChatData<DiaryScopeData>('current', 'diary');
  for (const book of data?.books ?? []) {
    const found = book.entries.find((e) => e.id === entryId);
    if (found) { entry.value = found; break; }
  }
  loading.value = false;
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
  const data = await loadChatData<DiaryScopeData>('current', 'diary');
  if (data) {
    for (const book of data.books) {
      const idx = book.entries.findIndex((e) => e.id === entryId);
      if (idx >= 0) { book.entries[idx] = { ...entry.value }; break; }
    }
    await saveChatData('current', 'diary', data);
  }
  if (entry.value.favorite) {
    await upsertSnapshot('current', 'diary', entry.value.id, entry.value.title, { type: 'diary', item: entry.value });
  } else {
    await deleteSnapshot('current', 'diary', entry.value.id);
  }
}

async function deleteEntry() {
  if (!entry.value || !confirm('确定删除？')) return;
  const data = await loadChatData<DiaryScopeData>('current', 'diary');
  if (data) {
    for (const book of data.books) {
      book.entries = book.entries.filter((e) => e.id !== entryId);
    }
    await saveChatData('current', 'diary', data);
  }
  if (entry.value.favorite) await deleteSnapshot('current', 'diary', entry.value.id);
  navStore.back();
}

onMounted(() => load());
</script>
