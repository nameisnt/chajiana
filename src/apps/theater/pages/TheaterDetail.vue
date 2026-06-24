<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!entry" class="text-center text-secondary py-8">剧目不存在</div>
    <div v-else>
      <h2 class="text-lg font-bold mb-1">{{ entry.title }}</h2>
      <p class="text-xs text-secondary mb-1">
        {{ entry.participants.map((p) => p.name).join('、') }}
        <span class="ml-2 px-1 py-0.5 rounded text-xs" :class="entry.renderMode === 'frontend' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'">
          {{ entry.renderMode === 'frontend' ? '前端渲染' : 'Markdown' }}
        </span>
      </p>
      <p class="text-xs text-secondary mb-3">{{ formatDate(entry.createdAt) }}</p>

      <div class="pc-glass-card p-4 mb-3">
        <!-- Markdown 模式 -->
        <div v-if="entry.renderMode !== 'frontend'" class="text-sm whitespace-pre-wrap">
          {{ entry.content }}
        </div>
        <!-- Frontend 模式：使用 FrontendFrame -->
        <FrontendFrame
          v-else
          :htmlContent="entry.content"
          :renderMode="'frontend'"
        />
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
import FrontendFrame from '@/components/FrontendFrame.vue';
import type { TheaterScopeData, TheaterEntry, RenderMode } from '@/types';

const navStore = useNavigationStore();
const entryId = navStore.currentNav?.params?.entryId;
const entry = ref<TheaterEntry | null>(null);
const loading = ref(true);

function formatDate(iso: string) { return iso.slice(0, 10); }

async function load() {
  if (!entryId) return;
  loading.value = true;
  const data = await loadChatData<TheaterScopeData>('current', 'theater');
  const found = data?.entries.find((e) => e.id === entryId) ?? null;
  entry.value = found;
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
  const data = await loadChatData<TheaterScopeData>('current', 'theater');
  if (data) {
    const idx = data.entries.findIndex((e) => e.id === entryId);
    if (idx >= 0) { data.entries[idx] = { ...entry.value }; }
    await saveChatData('current', 'theater', data);
  }
  if (entry.value.favorite) {
    await upsertSnapshot('current', 'theater', entry.value.id, entry.value.title, { type: 'theater', item: entry.value });
  } else {
    await deleteSnapshot('current', 'theater', entry.value.id);
  }
}

async function deleteEntry() {
  if (!entry.value || !confirm('确定删除？')) return;
  const data = await loadChatData<TheaterScopeData>('current', 'theater');
  if (data) {
    data.entries = data.entries.filter((e) => e.id !== entryId);
    await saveChatData('current', 'theater', data);
  }
  if (entry.value.favorite) await deleteSnapshot('current', 'theater', entry.value.id);
  navStore.back();
}

onMounted(() => load());
</script>
