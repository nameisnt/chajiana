<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">{{ book?.title }}</h2>
        <div class="flex gap-2">
          <button class="pc-btn text-sm" @click="goGenerate('new')">写信</button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="goGenerate('reply')">回复</button>
        </div>
      </div>
      <input v-model="search" class="pc-input mb-3" placeholder="搜索标题..." />
      <div class="flex gap-2 mb-3">
        <button class="text-xs pc-btn pc-btn-secondary" @click="orderAsc = !orderAsc">
          {{ orderAsc ? '正序' : '倒序' }}
        </button>
      </div>
      <div v-if="filteredEntries.length === 0" class="text-center text-secondary py-8">暂无信件</div>
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
                {{ entry.sender.name }} → {{ entry.receiver.name }}
                <span class="ml-2 px-1 py-0.5 rounded text-xs" :class="formatBadgeClass(entry.format)">
                  {{ formatLabel(entry.format) }}
                </span>
              </p>
              <p class="text-xs text-secondary mt-0.5">{{ formatDate(entry.createdAt) }}</p>
            </div>
            <i v-if="entry.favorite" class="fa-solid fa-star text-yellow-400 text-xs ml-2"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData } from '@/repositories/data-repository';
import type { LettersScopeData, LettersEntry, LetterFormat } from '@/types';

const navStore = useNavigationStore();
const bookId = navStore.currentNav?.params?.bookId;
const book = ref<LettersScopeData['books'][0] | null>(null);
const entries = ref<LettersEntry[]>([]);
const loading = ref(true);
const search = ref('');
const orderAsc = ref(false);

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

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

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

async function load() {
  if (!bookId) return;
  loading.value = true;
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  book.value = data?.books.find((b) => b.id === bookId) ?? null;
  entries.value = book.value?.entries ?? [];
  loading.value = false;
}

function openDetail(entryId: string) { navStore.push(`detail/${entryId}`, '信件详情'); }
function goGenerate(mode: string) {
  const label = mode === 'reply' ? '回复信件' : '写新信';
  navStore.push(`generate/${bookId}`, label, { mode });
}

onMounted(() => load());
</script>
