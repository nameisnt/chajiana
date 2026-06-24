<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">{{ book?.title }}</h2>
        <button class="pc-btn text-sm" @click="goGenerate">新建总结</button>
      </div>
      <div v-if="entries.length === 0" class="text-center text-secondary py-8">暂无条目</div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="(entry, i) in sortedEntries"
          :key="entry.id"
          class="pc-glass-card p-3 cursor-pointer"
          @click="openDetail(entry.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ entry.title }}</p>
              <p class="text-xs text-secondary">{{ entry.rangeLabel }}</p>
            </div>
            <div class="flex items-center gap-2">
              <i v-if="entry.favorite" class="fa-solid fa-star text-yellow-400 text-xs"></i>
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
import type { SummariesScopeData, SummaryEntry } from '@/types';

const navStore = useNavigationStore();
const route = { params: { bookId: '' } };
const book = ref<SummariesScopeData['books'][0] | null>(null);
const entries = ref<SummaryEntry[]>([]);
const loading = ref(true);
const bookId = navStore.currentNav?.params?.bookId;

const sortedEntries = computed(() =>
  [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
);

async function load() {
  if (!bookId) return;
  loading.value = true;
  const data = await loadChatData<SummariesScopeData>('current', 'summaries');
  book.value = data?.books.find((b) => b.id === bookId) ?? null;
  entries.value = book.value?.entries ?? [];
  loading.value = false;
}

function openDetail(entryId: string) {
  navStore.push(`detail/${entryId}`, '总结详情');
}

function goGenerate() {
  navStore.push(`generate/${bookId}`, '新建总结');
}

onMounted(() => load());
</script>
