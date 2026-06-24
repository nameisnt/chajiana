<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold truncate flex-1 mr-2">{{ book?.title }}</h2>
        <div class="flex items-center gap-1">
          <button class="pc-btn pc-btn-secondary text-sm" @click="goGenerate('newChapter')">新建章节</button>
          <button v-if="chapters.length > 0" class="pc-btn pc-btn-secondary text-sm" @click="goGenerate('continueChapter')">续写</button>
        </div>
      </div>

      <!-- 搜索和排序 -->
      <input v-model="search" class="pc-input mb-3" placeholder="搜索标题或内容..." />
      <div class="flex gap-2 mb-3">
        <button class="text-xs pc-btn pc-btn-secondary" @click="orderAsc = !orderAsc">
          {{ orderAsc ? '正序' : '倒序' }}
        </button>
        <span class="text-xs text-secondary self-center">
          共 {{ chapters.length }} 章
        </span>
      </div>

      <div v-if="filteredChapters.length === 0" class="text-center text-secondary py-8">
        <p v-if="chapters.length === 0">暂无章节，开始创作吧</p>
        <p v-else>无匹配章节</p>
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="chapter in filteredChapters"
          :key="chapter.id"
          class="pc-glass-card p-3 cursor-pointer"
          @click="openDetail(chapter.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">
                <span class="text-xs text-secondary mr-1">第{{ chapter.chapterNumber }}章</span>
                {{ chapter.title }}
              </p>
              <p class="text-xs text-secondary truncate">
                {{ chapter.content.slice(0, 80) }}{{ chapter.content.length > 80 ? '...' : '' }}
              </p>
            </div>
            <div class="flex items-center gap-2 ml-2 shrink-0">
              <i v-if="chapter.favorite" class="fa-solid fa-star text-yellow-400 text-xs"></i>
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
import type { ExtrasScopeData, ExtraChapter } from '@/types';

const navStore = useNavigationStore();
const bookId = navStore.currentNav?.params?.bookId;
const book = ref<ExtrasScopeData['books'][0] | null>(null);
const chapters = ref<ExtraChapter[]>([]);
const loading = ref(true);
const search = ref('');
const orderAsc = ref(true);

const filteredChapters = computed(() => {
  let result = chapters.value.filter((c) => {
    if (!search.value) return true;
    const q = search.value.toLowerCase();
    return c.title.toLowerCase().includes(q)
      || c.content.toLowerCase().includes(q);
  });
  result = [...result].sort((a, b) => {
    const cmp = a.chapterNumber - b.chapterNumber;
    return orderAsc.value ? cmp : -cmp;
  });
  return result;
});

async function load() {
  if (!bookId) return;
  loading.value = true;
  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  book.value = data?.books.find((b) => b.id === bookId) ?? null;
  chapters.value = book.value?.chapters ?? [];
  loading.value = false;
}

function openDetail(chapterId: string) {
  navStore.push(`detail/${chapterId}`, '番外详情');
}

function goGenerate(mode: string) {
  navStore.push(`generate/${bookId}`, mode === 'newChapter' ? '新建章节' : '续写', { mode });
}

onMounted(() => load());
</script>
