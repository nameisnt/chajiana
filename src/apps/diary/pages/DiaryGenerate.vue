<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">写日记</h2>
    <div class="flex flex-col gap-3">
      <div>
        <label class="text-sm font-medium mb-1 block">来源范围</label>
        <select v-model="sourceMode" class="pc-input">
          <option value="latest">最新楼层</option>
          <option value="all">全部楼层</option>
          <option value="recent">最近 N 楼</option>
        </select>
        <input v-if="sourceMode === 'recent'" v-model.number="recentN" type="number" class="pc-input mt-2" placeholder="楼层数" />
      </div>
      <div>
        <label class="text-sm font-medium mb-1 block">结果处理</label>
        <select v-model="resultMode" class="pc-input">
          <option value="preview">预览后确认</option>
          <option value="save">直接保存</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="stream" type="checkbox" id="stream-d" />
        <label for="stream-d" class="text-sm">流式传输</label>
      </div>
      <button class="pc-btn w-full" :disabled="generating" @click="startGenerate">
        {{ generating ? '生成中...' : '开始生成' }}
      </button>
    </div>
    <div v-if="previewText" class="mt-4">
      <div class="pc-glass-card p-4">
        <pre class="text-sm whitespace-pre-wrap font-sans">{{ previewText }}</pre>
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

async function startGenerate() {
  const adapter = getAdapter('diary', 'normal');
  if (!adapter) { toastr?.error('未找到生成适配器'); return; }
  generating.value = true;
  try {
    const result = await generateContent(adapter, {
      perspective: { name: '角色' },
      kind: 'normal',
      generationConfig: { sourceMode: sourceMode.value, sourceRanges: [], resultMode: resultMode.value as 'preview' | 'save', stream: stream.value },
    });
    if (result.success) { toastr?.success('生成成功'); navStore.back(); }
    else { previewText.value = result.raw ?? result.error; }
  } catch (err) { toastr?.error('失败: ' + (err as Error).message); }
  finally { generating.value = false; }
}
</script>
