<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">{{ typeName }}</h2>
        <button class="pc-btn text-sm" @click="goGenerate">生成新剧目</button>
      </div>
      <input v-model="search" class="pc-input mb-3" placeholder="搜索标题..." />
      <div v-if="filteredEntries.length === 0" class="text-center text-secondary py-8">暂无剧目</div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="pc-glass-card p-3 cursor-pointer"
          @click="openDetail(entry.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ entry.title }}</p>
              <p class="text-xs text-secondary">
                {{ entry.participants.map((p) => p.name).join('、') }}
                <span class="ml-2 px-1 py-0.5 rounded text-xs" :class="entry.renderMode === 'frontend' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'">
                  {{ entry.renderMode === 'frontend' ? '前端' : 'MD' }}
                </span>
              </p>
              <p class="text-xs text-secondary mt-0.5">{{ formatDate(entry.createdAt) }}</p>
            </div>
            <i v-if="entry.favorite" class="fa-solid fa-star text-yellow-400 text-xs ml-2"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadChatData } from '@/repositories/data-repository';
import { DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';
import type { TheaterScopeData, TheaterEntry } from '@/types';

const navStore = useNavigationStore();
const typeId = navStore.currentNav?.params?.typeId;
const entries = ref<TheaterEntry[]>([]);
const loading = ref(true);
const search = ref('');

const typeName = computed(() => {
  // 先从内置查找
  const builtin = DEFAULT_TYPE_PROMPTS.theater.find((_, i) => `builtin-${i}` === typeId);
  if (builtin) return builtin.name;
  // 从已有条目中取第一个 entry 的 typeName
  return entries.value[0]?.typeName ?? '未知类型';
});

const filteredEntries = computed(() => {
  let result = entries.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.participants.some((p) => p.name.toLowerCase().includes(q)),
    );
  }
  return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

function formatDate(iso: string) { return iso.slice(0, 10); }

async function load() {
  if (!typeId) return;
  loading.value = true;
  const data = await loadChatData<TheaterScopeData>('current', 'theater');
  // 按 typeId 或 typeName 筛选（内置类型用 builtin-N，自定义类型用 UUID）
  const allEntries = data?.entries ?? [];
  if (typeId.startsWith('builtin-')) {
    const idx = parseInt(typeId.replace('builtin-', ''));
    const builtinName = DEFAULT_TYPE_PROMPTS.theater[idx]?.name;
    entries.value = builtinName ? allEntries.filter((e) => e.typeName === builtinName) : [];
  } else {
    entries.value = allEntries.filter((e) => e.typeId === typeId);
  }
  loading.value = false;
}

function openDetail(entryId: string) { navStore.push(`detail/${entryId}`, '剧目详情'); }
function goGenerate() { navStore.push(`generate/${typeId}`, '生成剧目'); }

onMounted(() => load());
</script>
