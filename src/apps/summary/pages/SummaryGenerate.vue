<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">新建总结</h2>
    <div class="flex flex-col gap-3">
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
      <div>
        <label class="text-sm font-medium mb-1 block">结果处理</label>
        <select v-model="resultMode" class="pc-input">
          <option value="preview">预览后确认</option>
          <option value="save">直接保存</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="stream" type="checkbox" id="stream-toggle" />
        <label for="stream-toggle" class="text-sm">流式传输</label>
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
import { generateContent } from '@/generation/generation-service';
import { getAdapter } from '@/generation/adapter-registry';

const navStore = useNavigationStore();
const sourceMode = ref<'latest' | 'all' | 'recent'>('latest');
const recentN = ref(5);
const resultMode = ref<'preview' | 'save'>('preview');
const stream = ref(false);
const generating = ref(false);
const previewText = ref('');
const previewInfo = ref<{ title: string; content: string } | null>(null);

async function startGenerate() {
  const adapter = getAdapter('summary', 'normal');
  if (!adapter) {
    toastr?.error('未找到总结生成适配器');
    return;
  }

  generating.value = true;
  previewText.value = '';

  try {
    const ranges = sourceMode.value === 'recent'
      ? [{ start: 0, end: recentN.value }]
      : [];

    const result = await generateContent(adapter, {
      rangeLabel: sourceMode.value === 'latest' ? '最新楼层' : sourceMode.value === 'all' ? '全部楼层' : `最近 ${recentN.value} 楼`,
      source: { label: '', ranges } as any,
      extraRequirement: '',
      generationConfig: {
        sourceMode: sourceMode.value,
        sourceRanges: ranges,
        resultMode: resultMode.value as 'preview' | 'save',
        stream: stream.value,
      },
    });

    if (result.success) {
      toastr?.success('总结生成成功');
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
</script>
