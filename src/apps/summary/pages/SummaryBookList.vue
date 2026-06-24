<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">总结</h2>
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="books.length === 0" class="text-center text-secondary py-8">
      <p class="mb-3">暂无总结集</p>
      <button class="pc-btn" @click="createBook">新建总结集</button>
    </div>
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="book in books"
        :key="book.id"
        class="pc-glass-card p-4 cursor-pointer"
        @click="openBook(book.id)"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">{{ book.title }}</h3>
            <p class="text-sm text-secondary">{{ book.entries.length }} 条总结</p>
          </div>
          <i class="fa-solid fa-chevron-right text-secondary"></i>
        </div>
      </div>
      <button class="pc-btn w-full" @click="createBook">新建总结集</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import type { SummariesScopeData } from '@/types';

const navStore = useNavigationStore();
const books = ref<SummariesScopeData['books']>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  const data = await loadChatData<SummariesScopeData>('current', 'summaries');
  books.value = data?.books ?? [];
  loading.value = false;
}

async function createBook() {
  const data = (await loadChatData<SummariesScopeData>('current', 'summaries')) ?? {
    books: [],
    failedDrafts: [],
  };
  const now = new Date().toISOString();
  data.books.push({
    id: crypto.randomUUID(),
    title: `总结集 ${data.books.length + 1}`,
    entries: [],
    createdAt: now,
    updatedAt: now,
  });
  await saveChatData('current', 'summaries', data);
  await load();
}

function openBook(bookId: string) {
  navStore.push(`entries/${bookId}`, '总结集');
}

onMounted(() => load());
</script>
