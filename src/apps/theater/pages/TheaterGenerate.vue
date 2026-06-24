<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">生成剧目</h2>
    <div class="flex flex-col gap-3">
      <!-- 类型选择 -->
      <div>
        <label class="text-sm font-medium mb-1 block">剧场类型</label>
        <select v-model="selectedTypeId" class="pc-input" @change="onTypeChange">
          <option v-for="t in allTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <p v-if="selectedTypePrompt" class="text-xs text-secondary mt-1 p-2 bg-gray-50 rounded">
          {{ selectedTypePrompt }}
        </p>
      </div>

      <!-- 参与角色 -->
      <div>
        <label class="text-sm font-medium mb-1 block">参与角色（用逗号分隔）</label>
        <input v-model="participantsInput" class="pc-input" placeholder="角色1, 角色2, ..." />
      </div>

      <!-- 渲染模式 -->
      <div>
        <label class="text-sm font-medium mb-1 block">渲染模式</label>
        <select v-model="renderMode" class="pc-input">
          <option value="markdown">Markdown</option>
          <option value="frontend">前端渲染 (HTML)</option>
        </select>
      </div>

      <!-- 来源范围 -->
      <div>
        <label class="text-sm font-medium mb-1 block">来源范围</label>
        <select v-model="sourceMode" class="pc-input">
          <option value="latest">最新楼层</option>
          <option value="all">全部楼层</option>
          <option value="recent">最近 N 楼</option>
        </select>
        <input v-if="sourceMode === 'recent'" v-model.number="recentN" type="number" class="pc-input mt-2" placeholder="楼层数" />
      </div>

      <!-- 结果处理 -->
      <div>
        <label class="text-sm font-medium mb-1 block">结果处理</label>
        <select v-model="resultMode" class="pc-input">
          <option value="preview">预览后确认</option>
          <option value="save">直接保存</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="stream" type="checkbox" id="stream-t" />
        <label for="stream-t" class="text-sm">流式传输</label>
      </div>

      <button class="pc-btn w-full" :disabled="generating" @click="startGenerate">
        {{ generating ? '生成中...' : '开始生成' }}
      </button>
    </div>

    <div v-if="previewText" class="mt-4">
      <div class="pc-glass-card p-4">
        <!-- Frontend 模式预览 -->
        <FrontendFrame
          v-if="renderMode === 'frontend' && previewText"
          :htmlContent="previewText"
          :renderMode="'frontend'"
        />
        <!-- Markdown 模式预览 -->
        <pre v-else class="text-sm whitespace-pre-wrap font-sans">{{ previewText }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { generateContent } from '@/generation/generation-service';
import { getAdapter } from '@/generation/adapter-registry';
import { loadGlobalData } from '@/repositories/data-repository';
import { DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';
import FrontendFrame from '@/components/FrontendFrame.vue';
import type { RenderMode } from '@/types';

const navStore = useNavigationStore();
const typeIdParam = navStore.currentNav?.params?.typeId;

interface TheaterTypeDef {
  id: string;
  name: string;
  prompt: string;
  renderMode: RenderMode;
  isBuiltin: boolean;
}

// 类型列表
const builtinTypes = DEFAULT_TYPE_PROMPTS.theater.map((t, i) => ({
  id: `builtin-${i}`,
  name: t.name,
  prompt: t.prompt,
  renderMode: 'markdown' as RenderMode,
  isBuiltin: true,
}));

const customTypes = ref<TheaterTypeDef[]>([]);
const allTypes = computed(() => [...builtinTypes, ...customTypes.value]);

const selectedTypeId = ref('');
const selectedTypePrompt = computed(() => {
  const t = allTypes.value.find((t) => t.id === selectedTypeId.value);
  return t?.prompt ?? '';
});
const selectedTypeName = computed(() => {
  const t = allTypes.value.find((t) => t.id === selectedTypeId.value);
  return t?.name ?? '';
});
const selectedTypeRenderMode = computed(() => {
  const t = allTypes.value.find((t) => t.id === selectedTypeId.value);
  return t?.renderMode ?? 'markdown';
});

const participantsInput = ref('');
const renderMode = ref<RenderMode>('markdown');
const sourceMode = ref<'latest' | 'all' | 'recent'>('latest');
const recentN = ref(5);
const resultMode = ref<'preview' | 'save'>('preview');
const stream = ref(false);
const generating = ref(false);
const previewText = ref('');

function onTypeChange() {
  // 选择类型时，自动设置 renderMode 为类型的默认渲染模式
  renderMode.value = selectedTypeRenderMode.value;
}

async function loadCustomTypes() {
  const prefs = await loadGlobalData<{ customTheaterTypes?: TheaterTypeDef[] }>('preferences');
  customTypes.value = prefs?.customTheaterTypes ?? [];

  // 默认选中：如果有 URL 参数中的 typeId，使用它；否则选第一个
  if (typeIdParam) {
    const exists = allTypes.value.find((t) => t.id === typeIdParam);
    if (exists) { selectedTypeId.value = typeIdParam; }
  }
  if (!selectedTypeId.value && allTypes.value.length > 0) {
    selectedTypeId.value = allTypes.value[0].id;
  }
  onTypeChange();
}

async function startGenerate() {
  if (!selectedTypeId.value) { toastr?.error('请选择剧场类型'); return; }
  if (!participantsInput.value.trim()) { toastr?.error('请输入参与角色'); return; }

  const adapter = getAdapter('theater', 'newTheater');
  if (!adapter) { toastr?.error('未找到生成适配器'); return; }

  generating.value = true;
  previewText.value = '';

  try {
    const participants = participantsInput.value
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const result = await generateContent(adapter, {
      typeId: selectedTypeId.value,
      typeName: selectedTypeName.value,
      participants,
      renderMode: renderMode.value,
      generationConfig: {
        sourceMode: sourceMode.value,
        sourceRanges: sourceMode.value === 'recent' ? [{ start: 0, end: recentN.value }] : [],
        resultMode: resultMode.value,
        stream: stream.value,
      },
    });

    if (result.success) {
      toastr?.success('生成成功');
      navStore.back();
    } else {
      previewText.value = result.raw ?? result.error;
      toastr?.error(result.error || '生成失败');
    }
  } catch (err) {
    toastr?.error('失败: ' + (err as Error).message);
  } finally {
    generating.value = false;
  }
}

onMounted(() => loadCustomTypes());
</script>
