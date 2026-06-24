<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">收藏夹</h2>

    <!-- Filters -->
    <div class="flex gap-2 mb-3 flex-wrap">
      <select v-model="filterType" class="pc-input text-sm">
        <option value="">全部类型</option>
        <option value="diary">日记</option>
        <option value="forum">论坛</option>
        <option value="extras">番外</option>
        <option value="theater">小剧场</option>
        <option value="letters">书信</option>
        <option value="summaries">总结</option>
      </select>
      <select v-model="filterScope" class="pc-input text-sm">
        <option value="">全部聊天</option>
        <option value="current">当前聊天</option>
        <option v-for="scope in availableScopes" :key="scope.id" :value="scope.id">
          {{ scope.name }}
        </option>
      </select>
      <button
        v-if="!batchMode"
        class="pc-btn pc-btn-secondary text-sm"
        @click="batchMode = true"
      >
        批量管理
      </button>
      <template v-else>
        <button class="pc-btn pc-btn-secondary text-sm" @click="selectAll">全选</button>
        <button class="pc-btn text-sm text-red-300" @click="batchUnfavorite">
          批量取消收藏 ({{ selectedKeys.length }})
        </button>
        <button class="pc-btn pc-btn-secondary text-sm" @click="batchMode = false">
          取消
        </button>
      </template>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>

    <!-- Empty -->
    <div v-else-if="filteredSnapshots.length === 0" class="text-center text-secondary py-8">
      <p>暂无收藏内容</p>
    </div>

    <!-- Snapshot List -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="s in filteredSnapshots"
        :key="s.key"
        class="pc-glass-card p-4 cursor-pointer"
        @click="handleClick(s)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- Batch checkbox -->
            <input
              v-if="batchMode"
              type="checkbox"
              class="shrink-0"
              :checked="selectedKeys.includes(s.key)"
              @click.stop
              @change="toggleSelect(s.key)"
            />
            <!-- Type icon -->
            <i :class="[typeIcons[s.contentType], 'text-lg shrink-0']"></i>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold truncate">{{ s.title }}</h3>
              <p class="text-xs text-secondary">
                {{ typeLabels[s.contentType] }} · {{ scopeName(s.sourceScopeId) }} · {{ formatDate(s.updatedAt) }}
              </p>
            </div>
          </div>
          <div v-if="isCurrentScope(s.sourceScopeId)" class="text-xs text-blue-400 shrink-0 ml-2">
            当前
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadAllSnapshots, batchDeleteSnapshots } from '@/repositories/favorite-snapshots';
import { getCachedIndex } from '@/repositories/storage-index';
import { loadIndex } from '@/repositories/storage-index';
import type { GlobalFavoriteSnapshot, ContentType, ScopeBinding } from '@/types';

const navStore = useNavigationStore();

const snapshots = ref<GlobalFavoriteSnapshot[]>([]);
const loading = ref(true);
const filterType = ref('');
const filterScope = ref('');
const batchMode = ref(false);
const selectedKeys = ref<string[]>([]);
const scopeBindings = ref<Record<string, ScopeBinding>>({});

const typeIcons: Record<ContentType, string> = {
  diary: 'fa-solid fa-book',
  forum: 'fa-solid fa-comments',
  extras: 'fa-solid fa-feather',
  theater: 'fa-solid fa-masks-theater',
  letters: 'fa-solid fa-envelope',
  summaries: 'fa-solid fa-list-check',
};

const typeLabels: Record<ContentType, string> = {
  diary: '日记',
  forum: '论坛',
  extras: '番外',
  theater: '小剧场',
  letters: '书信',
  summaries: '总结',
};

const contentTypeAppId: Record<ContentType, string> = {
  diary: 'diary',
  forum: 'forum',
  extras: 'extras',
  theater: 'theater',
  letters: 'letters',
  summaries: 'summary',
};

const appNames: Record<ContentType, string> = {
  diary: '日记',
  forum: '论坛',
  extras: '番外',
  theater: '小剧场',
  letters: '书信',
  summaries: '总结',
};

function getCurrentScopeId(): string {
  return (_.get(extension_settings, 'sillytavernPhone.scopeId') as string) ?? '';
}

function isCurrentScope(sourceScopeId: string): boolean {
  const current = getCurrentScopeId();
  return sourceScopeId === current;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function scopeName(sourceScopeId: string): string {
  const binding = scopeBindings.value[sourceScopeId];
  if (binding) {
    return binding.displayName || binding.ownerKey || sourceScopeId.slice(0, 8);
  }
  return sourceScopeId.slice(0, 8);
}

const availableScopes = computed(() => {
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];
  for (const s of snapshots.value) {
    const id = s.sourceScopeId;
    if (!seen.has(id)) {
      seen.add(id);
      result.push({ id, name: scopeName(id) });
    }
  }
  return result;
});

const filteredSnapshots = computed(() => {
  let list = snapshots.value;

  if (filterType.value) {
    list = list.filter((s) => s.contentType === filterType.value);
  }

  if (filterScope.value) {
    if (filterScope.value === 'current') {
      const currentId = getCurrentScopeId();
      list = list.filter((s) => s.sourceScopeId === currentId);
    } else {
      list = list.filter((s) => s.sourceScopeId === filterScope.value);
    }
  }

  return list;
});

function handleClick(snapshot: GlobalFavoriteSnapshot) {
  if (batchMode.value) {
    toggleSelect(snapshot.key);
    return;
  }

  if (isCurrentScope(snapshot.sourceScopeId)) {
    // Navigate to the original app's detail page
    const appId = contentTypeAppId[snapshot.contentType];
    navStore.openApp(appId, appNames[snapshot.contentType]);
  } else {
    // Navigate to favorites readonly detail
    navStore.push('detail/' + encodeURIComponent(snapshot.key), '收藏详情');
  }
}

function toggleSelect(key: string) {
  const idx = selectedKeys.value.indexOf(key);
  if (idx >= 0) {
    selectedKeys.value.splice(idx, 1);
  } else {
    selectedKeys.value.push(key);
  }
}

function selectAll() {
  if (selectedKeys.value.length === filteredSnapshots.value.length) {
    selectedKeys.value = [];
  } else {
    selectedKeys.value = filteredSnapshots.value.map((s) => s.key);
  }
}

async function batchUnfavorite() {
  if (selectedKeys.value.length === 0) return;
  if (!confirm(`确定取消收藏 ${selectedKeys.value.length} 项吗？`)) return;
  try {
    await batchDeleteSnapshots(selectedKeys.value);
    toastr?.success('已取消收藏');
    selectedKeys.value = [];
    batchMode.value = false;
    await load();
  } catch (e) {
    toastr?.error('操作失败');
  }
}

async function load() {
  loading.value = true;
  try {
    const index = await loadIndex();
    scopeBindings.value = index.scopeBindings;
  } catch {
    scopeBindings.value = {};
  }
  snapshots.value = await loadAllSnapshots();
  loading.value = false;
}

onMounted(() => load());
</script>
