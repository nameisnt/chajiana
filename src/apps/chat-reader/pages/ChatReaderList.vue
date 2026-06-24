<template>
  <div class="app-page">
    <template v-if="currentPage === 'read'">
      <ChatReaderView />
    </template>
    <template v-else>
      <h2 class="text-lg font-bold mb-3">阅读聊天</h2>
      <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
      <div v-else-if="chatFiles.length === 0" class="text-center text-secondary py-8">
        <p>暂无聊天记录</p>
      </div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="file in chatFiles"
          :key="file.file_name"
          class="pc-glass-card p-4 cursor-pointer"
          @click="openReader(file.file_name)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold truncate">{{ file.chat_title || file.file_name }}</h3>
              <p class="text-xs text-secondary mt-1">
                {{ formatDate(file.update_time) }} · {{ file.message_count }} 条消息
              </p>
            </div>
            <i class="fa-solid fa-chevron-right text-secondary ml-2"></i>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import ChatReaderView from './ChatReaderView.vue';

interface ChatFileBrief {
  file_name: string;
  chat_title?: string;
  update_time: string;
  message_count: number;
}

const navStore = useNavigationStore();
const chatFiles = ref<ChatFileBrief[]>([]);
const loading = ref(true);

/** Determine which sub-page to show based on nav state */
const currentPage = computed(() => {
  const page = navStore.currentNav?.page ?? '';
  if (page.startsWith('read/')) return 'read';
  return 'list';
});

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return iso.slice(0, 16).replace('T', ' ');
  } catch {
    return iso;
  }
}

async function load() {
  loading.value = true;
  try {
    const files = await (window.TavernHelper as any).getChatHistoryBrief('current');
    chatFiles.value = Array.isArray(files) ? files : [];
  } catch (err) {
    console.error('[阅读聊天] 加载聊天列表失败:', err);
    toastr?.error('加载聊天列表失败');
    chatFiles.value = [];
  }
  loading.value = false;
}

function openReader(fileName: string) {
  navStore.push(`read/${encodeURIComponent(fileName)}`, '阅读聊天', { chatFileName: fileName });
}

onMounted(() => load());
</script>
