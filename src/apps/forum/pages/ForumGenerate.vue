<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">{{ mode === 'continueReply' ? '回复帖子' : '发新帖' }}</h2>

    <div class="flex flex-col gap-3">
      <!-- 来源范围 -->
      <div>
        <label class="text-sm font-medium mb-1 block">来源范围</label>
        <select v-model="sourceMode" class="pc-input">
          <option value="latest">最新楼层</option>
          <option value="all">全部楼层</option>
          <option value="recent">最近 N 楼</option>
        </select>
        <input
          v-if="sourceMode === 'recent'"
          v-model.number="recentN"
          type="number"
          class="pc-input mt-2"
          placeholder="楼层数量"
          min="1"
        />
      </div>

      <!-- 模式 -->
      <div>
        <label class="text-sm font-medium mb-1 block">生成模式</label>
        <select v-model="mode" class="pc-input">
          <option value="newThread">发新帖</option>
          <option value="continueReply">续回</option>
        </select>
      </div>

      <!-- 续回模式：显示现有帖子与回复 -->
      <div v-if="mode === 'continueReply' && existingThread" class="pc-glass-card p-3">
        <h3 class="text-sm font-semibold mb-1">当前帖子</h3>
        <p class="text-xs text-secondary mb-1">标题: {{ existingThread.title }}</p>
        <p class="text-xs text-secondary mb-1">作者: {{ existingThread.author }}</p>
        <div class="text-xs text-secondary mb-2 line-clamp-3">{{ existingThread.content }}</div>
        <div v-if="existingThread.replies.length > 0" class="text-xs text-secondary">
          <p class="font-semibold mb-1">已有回复 ({{ existingThread.replies.length }}):</p>
          <div v-for="r in existingThread.replies" :key="r.id" class="ml-2 mb-1">
            <span class="font-medium">{{ r.author }}</span>: {{ r.content.slice(0, 80) }}{{ r.content.length > 80 ? '...' : '' }}
          </div>
        </div>
      </div>

      <!-- 额外要求 -->
      <div>
        <label class="text-sm font-medium mb-1 block">额外要求（可选）</label>
        <textarea
          v-model="extraRequirement"
          class="pc-textarea"
          rows="2"
          placeholder="特殊要求..."
        ></textarea>
      </div>

      <!-- 作者名 -->
      <div>
        <label class="text-sm font-medium mb-1 block">作者名（可选）</label>
        <input v-model="authorName" class="pc-input" placeholder="留空则自动生成" />
      </div>

      <!-- 结果处理 -->
      <div>
        <label class="text-sm font-medium mb-1 block">结果处理</label>
        <select v-model="resultMode" class="pc-input">
          <option value="preview">预览后确认</option>
          <option value="save">直接保存</option>
        </select>
      </div>

      <!-- 流式传输 -->
      <div class="flex items-center gap-2">
        <input v-model="stream" type="checkbox" id="stream-toggle-forum" />
        <label for="stream-toggle-forum" class="text-sm">流式传输</label>
      </div>

      <button class="pc-btn w-full mt-3" :disabled="generating" @click="startGenerate">
        <i v-if="generating" class="fa-solid fa-spinner fa-spin mr-2"></i>
        {{ generating ? '生成中...' : '开始生成' }}
      </button>
    </div>

    <!-- 预览区 -->
    <div v-if="previewText" class="mt-4">
      <div class="pc-glass-card p-4">
        <h3 class="font-semibold mb-2">生成结果</h3>
        <pre class="text-sm whitespace-pre-wrap font-sans">{{ previewText }}</pre>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="pc-btn flex-1" @click="confirmSave">确认保存</button>
        <button class="pc-btn pc-btn-secondary flex-1" @click="previewText = ''">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData } from '@/repositories/data-repository';
import { generateContent } from '@/generation/generation-service';
import { getAdapter } from '@/generation/adapter-registry';
import type { ForumScopeData, ForumThread } from '@/types';

const navStore = useNavigationStore();
const boardId = navStore.currentNav?.params?.boardId;
const initMode = navStore.currentNav?.params?.mode ?? 'newThread';
const initThreadId = navStore.currentNav?.params?.threadId;

const sourceMode = ref<'latest' | 'all' | 'recent'>('latest');
const recentN = ref(5);
const mode = ref<'newThread' | 'continueReply'>(initMode as 'newThread' | 'continueReply');
const extraRequirement = ref('');
const authorName = ref('');
const resultMode = ref<'preview' | 'save'>('preview');
const stream = ref(false);
const generating = ref(false);
const previewText = ref('');

const existingThread = ref<ForumThread | null>(null);

async function init() {
  if (!boardId) return;

  const data = await loadChatData<ForumScopeData>('current', 'forum');
  const board = data?.boards.find((b) => b.id === boardId);

  if (mode.value === 'continueReply' && initThreadId) {
    for (const b of data?.boards ?? []) {
      const t = b.threads.find((t) => t.id === initThreadId);
      if (t) {
        existingThread.value = t;
        break;
      }
    }
  }
}

async function startGenerate() {
  const adapter = getAdapter('forum', mode.value);
  if (!adapter) {
    toastr?.error('未找到论坛生成适配器');
    return;
  }

  generating.value = true;
  previewText.value = '';

  try {
    const rangeLabel = sourceMode.value === 'latest'
      ? '最新楼层'
      : sourceMode.value === 'all'
        ? '全部楼层'
        : `最近 ${recentN.value} 楼`;

    let extraContext = '';
    if (mode.value === 'continueReply' && existingThread.value) {
      extraContext = `当前帖子标题: ${existingThread.value.title}\n`
        + `主帖内容: ${existingThread.value.content}\n`
        + `已有回复:\n`
        + existingThread.value.replies.map(
            (r, i) => `[${i + 1}] ${r.author}: ${r.content}`
          ).join('\n');
    }

    const result = await generateContent(adapter, {
      boardId: boardId ?? '',
      boardName: '',
      author: authorName.value || undefined,
      mode: mode.value,
      threadId: mode.value === 'continueReply' ? existingThread.value?.id : undefined,
      extraRequirement: extraRequirement.value || undefined,
      extraContext: extraContext || undefined,
      generationConfig: {
        sourceMode: sourceMode.value,
        sourceRanges: sourceMode.value === 'recent' ? [{ start: 0, end: recentN.value }] : [],
        resultMode: resultMode.value as 'preview' | 'save',
        stream: stream.value,
      },
    });

    if (result.success) {
      toastr?.success('论坛生成成功');
      navStore.back();
    } else {
      previewText.value = result.raw ?? result.error;
    }
  } catch (err) {
    toastr?.error('生成失败: ' + (err as Error).message);
  } finally {
    generating.value = false;
  }
}

async function confirmSave() {
  previewText.value = '';
  navStore.back();
}

onMounted(() => init());
</script>
