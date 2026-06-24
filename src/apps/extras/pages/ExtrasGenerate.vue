<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">{{ mode === 'continueChapter' ? '续写章节' : '新建章节' }}</h2>

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

      <!-- 类型（从书继承） -->
      <div>
        <label class="text-sm font-medium mb-1 block">番外类型</label>
        <select v-model="selectedType" class="pc-input">
          <option v-for="t in typeOptions" :key="t.name" :value="t.name">{{ t.name }}</option>
        </select>
      </div>

      <!-- 额外要求 -->
      <div>
        <label class="text-sm font-medium mb-1 block">额外要求（可选）</label>
        <textarea
          v-model="extraRequirement"
          class="pc-textarea"
          rows="2"
          placeholder="对本章的特殊要求..."
        ></textarea>
      </div>

      <!-- 续写模式：显示已有章节摘要 -->
      <div v-if="mode === 'continueChapter' && existingChapters.length > 0" class="pc-glass-card p-3">
        <h3 class="text-sm font-semibold mb-1">已有章节</h3>
        <div class="text-xs text-secondary space-y-1">
          <p v-for="c in existingChapters" :key="c.id">
            第{{ c.chapterNumber }}章 {{ c.title }}
          </p>
        </div>
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
        <input v-model="stream" type="checkbox" id="stream-toggle-extras" />
        <label for="stream-toggle-extras" class="text-sm">流式传输</label>
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
import { DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';
import type { ExtrasScopeData, ExtraChapter } from '@/types';

const navStore = useNavigationStore();
const bookId = navStore.currentNav?.params?.bookId;
const initMode = navStore.currentNav?.params?.mode ?? 'newChapter';

const sourceMode = ref<'latest' | 'all' | 'recent'>('latest');
const recentN = ref(5);
const selectedType = ref('');
const extraRequirement = ref('');
const resultMode = ref<'preview' | 'save'>('preview');
const stream = ref(false);
const generating = ref(false);
const previewText = ref('');
const mode = ref<'newChapter' | 'continueChapter'>(initMode as 'newChapter' | 'continueChapter');

const existingChapters = ref<ExtraChapter[]>([]);
const typeOptions = DEFAULT_TYPE_PROMPTS.extras;

async function init() {
  if (!bookId) return;
  const data = await loadChatData<ExtrasScopeData>('current', 'extras');
  const book = data?.books.find((b) => b.id === bookId);
  if (book) {
    selectedType.value = book.typeName;
    existingChapters.value = [...book.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  }
}

async function startGenerate() {
  const adapter = getAdapter('extras', mode.value);
  if (!adapter) {
    toastr?.error('未找到番外生成适配器');
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

    const extraContext = mode.value === 'continueChapter'
      ? existingChapters.value.map((c) => `第${c.chapterNumber}章: ${c.title} - ${c.content.slice(0, 200)}`).join('\n')
      : undefined;

    const result = await generateContent(adapter, {
      typeId: selectedType.value,
      typeName: selectedType.value,
      bookId,
      sourceLabel: rangeLabel,
      mode: mode.value,
      extraRequirement: extraRequirement.value || undefined,
      extraContext,
      generationConfig: {
        sourceMode: sourceMode.value,
        sourceRanges: sourceMode.value === 'recent' ? [{ start: 0, end: recentN.value }] : [],
        resultMode: resultMode.value as 'preview' | 'save',
        stream: stream.value,
      },
    });

    if (result.success) {
      toastr?.success('番外生成成功');
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
