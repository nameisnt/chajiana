<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">日记</h2>
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="books.length === 0" class="text-center text-secondary py-8">
      <p>暂无日记，请先生成</p>
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
            <p class="text-sm text-secondary">{{ book.entries.length }} 篇日记</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-xs text-red-400" @click.stop="deleteBook(book.id)">删除</button>
            <i class="fa-solid fa-chevron-right text-secondary"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import type { DiaryScopeData } from '@/types';

const navStore = useNavigationStore();
const books = ref<DiaryScopeData['books']>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  const data = await loadChatData<DiaryScopeData>('current', 'diary');
  books.value = data?.books ?? [];
  loading.value = false;
}

function openBook(bookId: string) {
  navStore.push(`entries/${bookId}`, '日记目录');
}

async function deleteBook(bookId: string) {
  if (!confirm('确定删除整本日记吗？')) return;
  const data = await loadChatData<DiaryScopeData>('current', 'diary');
  if (data) {
    data.books = data.books.filter((b) => b.id !== bookId);
    await saveChatData('current', 'diary', data);
  }
  await load();
}

onMounted(() => load());
</script>
