<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">论坛</h2>

    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>

    <div v-else-if="boards.length === 0" class="text-center text-secondary py-8">
      <p class="mb-3">暂无板块</p>
      <button class="pc-btn" @click="showCreateDialog = true">新建板块</button>
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="board in boards"
        :key="board.id"
        class="pc-glass-card p-4 cursor-pointer"
        @click="openBoard(board.id)"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">{{ board.name }}</h3>
            <p class="text-sm text-secondary">
              {{ board.threads.length }} 个帖子
              <span v-if="board.description" class="ml-2">{{ board.description }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-red-400 hover:text-red-300"
              @click.stop="deleteBoard(board.id)"
            >
              删除
            </button>
            <i class="fa-solid fa-chevron-right text-secondary"></i>
          </div>
        </div>
      </div>

      <button class="pc-btn w-full" @click="showCreateDialog = true">新建板块</button>
    </div>

    <!-- 新建对话框 -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showCreateDialog = false">
      <div class="pc-glass-card p-5 w-[300px] max-w-[90vw]">
        <h3 class="font-semibold mb-3">新建板块</h3>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm font-medium mb-1 block">板块名称</label>
            <input v-model="newBoardName" class="pc-input" placeholder="板块名称" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">描述（可选）</label>
            <textarea v-model="newBoardDesc" class="pc-textarea" rows="2" placeholder="板块描述..."></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="pc-btn pc-btn-secondary text-sm" @click="showCreateDialog = false">取消</button>
            <button class="pc-btn text-sm" :disabled="!newBoardName.trim()" @click="createBoard">创建</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData, saveChatData } from '@/repositories/data-repository';
import type { ForumScopeData } from '@/types';

const navStore = useNavigationStore();
const boards = ref<ForumScopeData['boards']>([]);
const loading = ref(true);

const showCreateDialog = ref(false);
const newBoardName = ref('');
const newBoardDesc = ref('');

async function load() {
  loading.value = true;
  const data = await loadChatData<ForumScopeData>('current', 'forum');
  boards.value = data?.boards ?? [];
  loading.value = false;
}

async function createBoard() {
  const name = newBoardName.value.trim();
  if (!name) return;

  const data = (await loadChatData<ForumScopeData>('current', 'forum')) ?? {
    boards: [],
    failedDrafts: [],
  };
  const now = new Date().toISOString();

  data.boards.push({
    id: crypto.randomUUID(),
    name,
    description: newBoardDesc.value || undefined,
    threads: [],
    createdAt: now,
    updatedAt: now,
  });

  await saveChatData('current', 'forum', data);
  showCreateDialog.value = false;
  newBoardName.value = '';
  newBoardDesc.value = '';
  await load();
}

async function deleteBoard(boardId: string) {
  if (!confirm('确定删除此板块吗？所有帖子将被删除。')) return;
  const data = await loadChatData<ForumScopeData>('current', 'forum');
  if (data) {
    data.boards = data.boards.filter((b) => b.id !== boardId);
    await saveChatData('current', 'forum', data);
  }
  await load();
}

function openBoard(boardId: string) {
  navStore.push(`threads/${boardId}`, '帖子列表');
}

onMounted(() => load());
</script>
