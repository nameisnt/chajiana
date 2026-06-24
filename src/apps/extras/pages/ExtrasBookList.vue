<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">番外</h2>

    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>

    <div v-else-if="books.length === 0" class="text-center text-secondary py-8">
      <p class="mb-3">暂无番外集</p>
      <button class="pc-btn" @click="showCreateDialog = true">新建番外集</button>
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
            <p class="text-sm text-secondary">
              <span class="mr-2">{{ book.typeName }}</span>
              {{ book.chapters.length }} 章
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-red-400 hover:text-red-300"
              @click.stop="deleteBook(book.id)"
            >
              删除
            </button>
            <i class="fa-solid fa-chevron-right text-secondary"></i>
          </div>
        </div>
      </div>

      <button class="pc-btn w-full" @click="showCreateDialog = true">新建番外集</button>
    </div>

    <!-- 新建对话框 -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showCreateDialog = false">
      <div class="pc-glass-card p-5 w-[300px] max-w-[90vw]">
        <h3 class="font-semibold mb-3">新建番外集</h3>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm font-medium mb-1 block">类型</label>
            <select v-model="newBookType" class="pc-input">
              <option v-for="t in typeOptions" :key="t.name" :value="t.name">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">标题</label>
            <input v-model="newBookTitle" class="pc-input" placeholder="番外集标题" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">大纲（可选）</label>
            <textarea v-model="newBookOutline" class="pc-textarea" rows="3" placeholder="番外大纲..."></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="pc-btn pc-btn-secondary text-sm" @click="showCreateDialog = false">取消</button>
            <button class="pc-btn text-sm" :disabled="!newBookType" @click="createBook">创建</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import { DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';
import type { ExtrasScopeData } from '@/types';

const navStore = useNavigationStore();
const books = ref<ExtrasScopeData['books']>([]);
const loading = ref(true);

const showCreateDialog = ref(false);
const newBookType = ref('');
const newBookTitle = ref('');
const newBookOutline = ref('');

const typeOptions = DEFAULT_TYPE_PROMPTS.extras;

async function load() {
  loading.value = true;
  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  books.value = data?.books ?? [];
  loading.value = false;
}

async function createBook() {
  if (!newBookType.value) return;

  const data = (await loadChatData<ExtrasScopeData>('current', 'extras')) ?? {
    books: [],
    failedDrafts: [],
  };
  const now = new Date().toISOString();
  const title = newBookTitle.value || `${newBookType.value}番外`;

  data.books.push({
    id: crypto.randomUUID(),
    typeId: newBookType.value,
    typeName: newBookType.value,
    title,
    outline: newBookOutline.value || undefined,
    chapters: [],
    summaries: [],
    createdAt: now,
    updatedAt: now,
  });

  await saveChatData('current', 'extras', data);
  showCreateDialog.value = false;
  newBookType.value = '';
  newBookTitle.value = '';
  newBookOutline.value = '';
  await load();
}

async function deleteBook(bookId: string) {
  if (!confirm('确定删除这本番外集吗？所有章节将被删除。')) return;
  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  if (data) {
    data.books = data.books.filter((b) => b.id !== bookId);
    await saveChatData('current', 'extras', data);
  }
  await load();
}

function openBook(bookId: string) {
  navStore.push(`chapters/${bookId}`, '番外章节');
}

onMounted(() => load());
</script>
