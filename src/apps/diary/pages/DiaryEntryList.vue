<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">{{ book?.title }}</h2>
        <button class="pc-btn text-sm" @click="goGenerate">写日记</button>
      </div>
      <input v-model="search" class="pc-input mb-3" placeholder="搜索标题..." />
      <div class="flex gap-2 mb-3">
        <button class="text-xs pc-btn pc-btn-secondary" @click="orderAsc = !orderAsc">
          {{ orderAsc ? '正序' : '倒序' }}
        </button>
      </div>
      <div v-if="filteredEntries.length === 0" class="text-center text-secondary py-8">暂无条目</div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="pc-glass-card p-3 cursor-pointer"
          @click="openDetail(entry.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ entry.title }}</p>
              <p class="text-xs text-secondary">
                {{ entry.kind === 'read-reaction' ? '📖 阅读反应' : '' }}
                {{ formatDate(entry.createdAt) }}
              </p>
            </div>
            <i v-if="entry.favorite" class="fa-solid fa-star text-yellow-400 text-xs"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData } from '@/repositories/data-repository';
import type { DiaryScopeData, DiaryEntry } from '@/types';

const navStore = useNavigationStore();
const bookId = navStore.currentNav?.params?.bookId;
const book = ref<DiaryScopeData['books'][0] | null>(null);
const entries = ref<DiaryEntry[]>([]);
const loading = ref(true);
const search = ref('');
const orderAsc = ref(false);

const filteredEntries = computed(() => {
  let result = entries.value.filter((e) =>
    search.value ? e.title.includes(search.value) : true,
  );
  result = [...result].sort((a, b) => {
    const cmp = a.createdAt.localeCompare(b.createdAt);
    return orderAsc.value ? cmp : -cmp;
  });
  return result;
});

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

async function load() {
  if (!bookId) return;
  loading.value = true;
  const data = await loadChatData<DiaryScopeData>('current', 'diary');
  book.value = data?.books.find((b) => b.id === bookId) ?? null;
  entries.value = book.value?.entries ?? [];
  loading.value = false;
}

function openDetail(entryId: string) { navStore.push(`detail/${entryId}`, '日记详情'); }
function goGenerate() { navStore.push(`generate/${bookId}`, '写日记'); }

onMounted(() => load());
</script>
