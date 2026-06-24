<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">小剧场</h2>

    <!-- 添加自定义类型 -->
    <button class="pc-btn pc-btn-secondary w-full mb-3 text-sm" @click="showAddForm = !showAddForm">
      {{ showAddForm ? '取消' : '+ 添加自定义类型' }}
    </button>

    <div v-if="showAddForm" class="pc-glass-card p-4 mb-3">
      <div class="flex flex-col gap-3">
        <input v-model="newTypeName" class="pc-input" placeholder="类型名称" />
        <textarea v-model="newTypePrompt" class="pc-textarea" rows="3" placeholder="类型提示词"></textarea>
        <select v-model="newTypeRenderMode" class="pc-input">
          <option value="markdown">Markdown 渲染</option>
          <option value="frontend">前端渲染 (HTML)</option>
        </select>
        <button class="pc-btn text-sm" @click="addCustomType">添加</button>
      </div>
    </div>

    <!-- 编辑自定义类型表单 -->
    <div v-if="editingType" class="pc-glass-card p-4 mb-3">
      <div class="flex flex-col gap-3">
        <input v-model="editTypeName" class="pc-input" placeholder="类型名称" />
        <textarea v-model="editTypePrompt" class="pc-textarea" rows="3" placeholder="类型提示词"></textarea>
        <select v-model="editTypeRenderMode" class="pc-input">
          <option value="markdown">Markdown 渲染</option>
          <option value="frontend">前端渲染 (HTML)</option>
        </select>
        <div class="flex gap-2">
          <button class="pc-btn text-sm" @click="saveEditType">保存</button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="editingType = null">取消</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="displayTypes.length === 0" class="text-center text-secondary py-8">
      <p>暂无剧场类型</p>
    </div>
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="t in displayTypes"
        :key="t.id"
        class="pc-glass-card p-4 cursor-pointer"
        @click="openType(t.id, t.name)"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold">{{ t.name }}</h3>
              <span v-if="t.isBuiltin" class="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-600">内置</span>
              <span class="text-xs px-1 py-0.5 rounded" :class="t.renderMode === 'frontend' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'">
                {{ t.renderMode === 'frontend' ? '前端' : 'MD' }}
              </span>
            </div>
            <p class="text-sm text-secondary">{{ t.prompt?.slice(0, 60) }}{{ t.prompt && t.prompt.length > 60 ? '...' : '' }}</p>
            <p class="text-xs text-secondary mt-1">{{ t.entryCount }} 个剧目</p>
          </div>
          <div v-if="!t.isBuiltin" class="flex items-center gap-1 ml-2" @click.stop>
            <button class="text-xs text-blue-400" @click="startEdit(t)">编辑</button>
            <button class="text-xs text-red-400" @click="deleteCustomType(t.id)">删除</button>
          </div>
          <i v-else class="fa-solid fa-chevron-right text-secondary ml-2"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData } from '@/repositories/data-repository';
import { loadGlobalData, saveGlobalData } from '@/repositories/data-repository';
import { DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';
import type { TheaterScopeData, RenderMode } from '@/types';
const navStore = useNavigationStore();

interface TheaterTypeDef {
  id: string;
  name: string;
  prompt: string;
  renderMode: RenderMode;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

const loading = ref(true);
const customTypes = ref<TheaterTypeDef[]>([]);
const entryCounts = ref<Record<string, number>>({});

// Add form
const showAddForm = ref(false);
const newTypeName = ref('');
const newTypePrompt = ref('');
const newTypeRenderMode = ref<RenderMode>('markdown');

// Edit form
const editingType = ref<string | null>(null);
const editTypeName = ref('');
const editTypePrompt = ref('');
const editTypeRenderMode = ref<RenderMode>('markdown');

// 内置类型
const builtinTypes = computed<TheaterTypeDef[]>(() =>
  DEFAULT_TYPE_PROMPTS.theater.map((t, i) => ({
    id: `builtin-${i}`,
    name: t.name,
    prompt: t.prompt,
    renderMode: 'markdown' as RenderMode,
    isBuiltin: true,
    createdAt: '',
    updatedAt: '',
  })),
);

// 合并并排序
const displayTypes = computed(() => {
  const all = [...builtinTypes.value, ...customTypes.value];
  return all.sort((a, b) => {
    const countA = entryCounts.value[a.name] ?? 0;
    const countB = entryCounts.value[b.name] ?? 0;
    return countB - countA; // 按使用次数降序
  });
});

async function load() {
  loading.value = true;
  // 加载自定义类型
  const prefs = await loadGlobalData<{ customTheaterTypes?: TheaterTypeDef[] }>('preferences');
  customTypes.value = prefs?.customTheaterTypes ?? [];

  // 加载使用计数
  const data = await loadChatData<TheaterScopeData>('current', 'theater');
  const counts: Record<string, number> = {};
  for (const entry of data?.entries ?? []) {
    counts[entry.typeName] = (counts[entry.typeName] || 0) + 1;
  }
  entryCounts.value = counts;

  loading.value = false;
}

async function saveCustomTypes() {
  const prefs = await loadGlobalData<Record<string, unknown>>('preferences') ?? {};
  prefs.customTheaterTypes = customTypes.value;
  await saveGlobalData('preferences', prefs);
}

async function addCustomType() {
  if (!newTypeName.value.trim()) { toastr?.error('请输入类型名称'); return; }
  if (!newTypePrompt.value.trim()) { toastr?.error('请输入提示词'); return; }

  const now = new Date().toISOString();
  customTypes.value.push({
    id: crypto.randomUUID(),
    name: newTypeName.value.trim(),
    prompt: newTypePrompt.value.trim(),
    renderMode: newTypeRenderMode.value,
    isBuiltin: false,
    createdAt: now,
    updatedAt: now,
  });

  await saveCustomTypes();
  newTypeName.value = '';
  newTypePrompt.value = '';
  newTypeRenderMode.value = 'markdown';
  showAddForm.value = false;
  toastr?.success('已添加');
}

function startEdit(t: TheaterTypeDef) {
  editingType.value = t.id;
  editTypeName.value = t.name;
  editTypePrompt.value = t.prompt;
  editTypeRenderMode.value = t.renderMode;
}

async function saveEditType() {
  if (!editingType.value) return;
  if (!editTypeName.value.trim()) { toastr?.error('请输入类型名称'); return; }

  const idx = customTypes.value.findIndex((t) => t.id === editingType.value);
  if (idx >= 0) {
    customTypes.value[idx] = {
      ...customTypes.value[idx],
      name: editTypeName.value.trim(),
      prompt: editTypePrompt.value.trim(),
      renderMode: editTypeRenderMode.value,
      updatedAt: new Date().toISOString(),
    };
  }

  await saveCustomTypes();
  editingType.value = null;
  toastr?.success('已保存');
}

async function deleteCustomType(typeId: string) {
  if (!confirm('确定删除此类型？')) return;
  customTypes.value = customTypes.value.filter((t) => t.id !== typeId);
  await saveCustomTypes();
  toastr?.success('已删除');
}

function openType(typeId: string, name: string) {
  navStore.push(`entries/${typeId}`, name);
}

onMounted(() => load());
</script>
