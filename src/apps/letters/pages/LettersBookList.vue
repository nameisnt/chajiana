<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">书信</h2>
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="books.length === 0" class="text-center text-secondary py-8">
      <p>暂无书信，请先生成</p>
    </div>
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="book in books"
        :key="book.id"
        class="pc-glass-card p-4 cursor-pointer"
        @click="openBook(book.id)"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold truncate">{{ book.title }}</h3>
            <p class="text-sm text-secondary">{{ book.entries.length }} 封信件</p>
            <p class="text-xs text-secondary mt-1">
              <span v-for="(fmt, i) in formatSummary(book)" :key="i" class="mr-2">
                {{ fmt }}
              </span>
            </p>
          </div>
          <div class="flex items-center gap-2 ml-2">
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
import type { LettersScopeData, LetterBook, LetterFormat } from '@/types';

const navStore = useNavigationStore();
const books = ref<LettersScopeData['books']>([]);
const loading = ref(true);

function formatLabel(fmt: LetterFormat): string {
  const map: Record<LetterFormat, string> = { formal: '正式', note: '便条', sms: '短信', email: '邮件' };
  return map[fmt];
}

function formatSummary(book: LetterBook): string[] {
  const counts: Record<string, number> = {};
  for (const e of book.entries) {
    const label = formatLabel(e.format);
    counts[label] = (counts[label] || 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `${k}×${v}`);
}

async function load() {
  loading.value = true;
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  books.value = data?.books ?? [];
  loading.value = false;
}

function openBook(bookId: string) {
  const book = books.value.find((b) => b.id === bookId);
  navStore.push(`entries/${bookId}`, book?.title ?? '书信目录');
}

async function deleteBook(bookId: string) {
  if (!confirm('确定删除整本书信集吗？')) return;
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  if (data) {
    data.books = data.books.filter((b) => b.id !== bookId);
    await saveChatData('current', 'letters', data);
  }
  await load();
}

onMounted(() => load());
</script>
