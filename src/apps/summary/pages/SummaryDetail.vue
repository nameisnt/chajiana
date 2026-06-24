<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!entry" class="text-center text-secondary py-8">条目不存在</div>
    <div v-else>
      <h2 class="text-lg font-bold mb-2">{{ entry.title }}</h2>
      <p class="text-xs text-secondary mb-3">来源：{{ entry.rangeLabel }}</p>
      <div class="pc-glass-card p-4 mb-3">
        <div class="prose text-sm whitespace-pre-wrap">{{ entry.content }}</div>
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
import type { SummariesScopeData, SummaryEntry } from '@/types';

const navStore = useNavigationStore();
const entryId = navStore.currentNav?.params?.entryId;
const entry = ref<SummaryEntry | null>(null);
const loading = ref(true);

async function load() {
  if (!entryId) return;
  loading.value = true;
  const data = await loadChatData<SummariesScopeData>('current', 'summaries');
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

  const data = await loadChatData<SummariesScopeData>('current', 'summaries');
  if (data) {
    for (const book of data.books) {
      const idx = book.entries.findIndex((e) => e.id === entry.value!.id);
      if (idx >= 0) {
        book.entries[idx] = { ...entry.value };
        break;
      }
    }
    await saveChatData('current', 'summaries', data);
  }

  if (entry.value.favorite) {
    await upsertSnapshot('current', 'summaries', entry.value.id, entry.value.title, {
      type: 'summaries',
      item: entry.value,
    });
  } else {
    await deleteSnapshot('current', 'summaries', entry.value.id);
  }
}

async function deleteEntry() {
  if (!entry.value || !confirm('确定删除这条总结吗？')) return;
  const data = await loadChatData<SummariesScopeData>('current', 'summaries');
  if (data) {
    for (const book of data.books) {
      book.entries = book.entries.filter((e) => e.id !== entry.value!.id);
    }
    await saveChatData('current', 'summaries', data);
  }
  if (entry.value.favorite) {
    await deleteSnapshot('current', 'summaries', entry.value.id);
  }
  navStore.back();
}

onMounted(() => load());
</script>
