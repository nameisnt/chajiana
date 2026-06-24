<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!chapter" class="text-center text-secondary py-8">章节不存在</div>
    <div v-else>
      <h2 class="text-lg font-bold mb-1">
        <span class="text-sm text-secondary font-normal">第{{ chapter.chapterNumber }}章</span>
        {{ chapter.title }}
      </h2>
      <p class="text-xs text-secondary mb-2">{{ bookTitle }}</p>

      <div class="pc-glass-card p-4 mb-3">
        <div class="text-sm whitespace-pre-wrap leading-relaxed">{{ chapter.content }}</div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button class="pc-btn pc-btn-secondary text-sm" @click="copyContent">复制</button>
        <button class="pc-btn pc-btn-secondary text-sm" @click="toggleFavorite">
          <i :class="chapter.favorite ? 'fa-solid' : 'fa-regular'" class="fa-star mr-1"></i>
          {{ chapter.favorite ? '已收藏' : '收藏' }}
        </button>
        <button class="pc-btn pc-btn-secondary text-sm" @click="deleteChapter">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import { upsertSnapshot, deleteSnapshot } from '@/repositories/favorite-snapshots';
import type { ExtrasScopeData, ExtraChapter } from '@/types';

const navStore = useNavigationStore();
const chapterId = navStore.currentNav?.params?.chapterId;
const chapter = ref<ExtraChapter | null>(null);
const bookTitle = ref('');
const loading = ref(true);

async function load() {
  if (!chapterId) return;
  loading.value = true;
  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  for (const book of data?.books ?? []) {
    const found = book.chapters.find((c) => c.id === chapterId);
    if (found) {
      chapter.value = found;
      bookTitle.value = book.title;
      break;
    }
  }
  loading.value = false;
}

async function copyContent() {
  if (!chapter.value) return;
  await navigator.clipboard.writeText(chapter.value.content);
  toastr?.success('已复制');
}

async function toggleFavorite() {
  if (!chapter.value) return;
  chapter.value.favorite = !chapter.value.favorite;
  chapter.value.updatedAt = new Date().toISOString();

  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  if (data) {
    for (const book of data.books) {
      const idx = book.chapters.findIndex((c) => c.id === chapter.value!.id);
      if (idx >= 0) {
        book.chapters[idx] = { ...chapter.value };
        break;
      }
    }
    await saveChatData('current', 'extras', data);
  }

  if (chapter.value.favorite) {
    await upsertSnapshot('current', 'extras', chapter.value.id, chapter.value.title, {
      type: 'extras',
      item: chapter.value,
    });
  } else {
    await deleteSnapshot('current', 'extras', chapter.value.id);
  }
}

async function deleteChapter() {
  if (!chapter.value || !confirm('确定删除此章节吗？')) return;
  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  if (data) {
    for (const book of data.books) {
      book.chapters = book.chapters.filter((c) => c.id !== chapter.value!.id);
    }
    await saveChatData('current', 'extras', data);
  }
  if (chapter.value.favorite) {
    await deleteSnapshot('current', 'extras', chapter.value.id);
  }
  navStore.back();
}

onMounted(() => load());
</script>
