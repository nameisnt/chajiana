<template>
  <div class="app-page">
    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="!snapshot" class="text-center text-secondary py-8">快照不存在</div>
    <div v-else>
      <div class="flex items-center gap-2 mb-3">
        <i :class="[typeIcons[snapshot.contentType], 'text-lg']"></i>
        <h2 class="text-lg font-bold truncate">{{ snapshot.title }}</h2>
      </div>

      <p class="text-xs text-secondary mb-3">
        {{ typeLabels[snapshot.contentType] }} · {{ scopeLabel }} · {{ formatDate(snapshot.updatedAt) }}
      </p>

      <!-- Content -->
      <div class="pc-glass-card p-4 mb-3">
        <h3 class="font-semibold mb-2">{{ payloadTitle }}</h3>
        <div class="text-sm whitespace-pre-wrap">{{ payloadContent }}</div>
      </div>

      <!-- JSON detail (expandable) -->
      <details class="mb-3">
        <summary class="text-xs text-secondary cursor-pointer">查看原始数据</summary>
        <pre class="pc-glass-card p-2 mt-1 text-xs overflow-auto max-h-48">{{ JSON.stringify(snapshot.payload, null, 2) }}</pre>
      </details>

      <!-- Actions -->
      <div class="flex gap-2 flex-wrap">
        <button class="pc-btn pc-btn-secondary text-sm" @click="copyContent">复制内容</button>
        <button class="pc-btn pc-btn-secondary text-sm text-red-400" @click="removeFavorite">
          取消收藏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadAllSnapshots, deleteSnapshot } from '@/repositories/favorite-snapshots';
import { loadIndex } from '@/repositories/storage-index';
import type { GlobalFavoriteSnapshot, ContentType, ScopeBinding } from '@/types';

const navStore = useNavigationStore();

const snapshot = ref<GlobalFavoriteSnapshot | null>(null);
const loading = ref(true);
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

const scopeLabel = computed(() => {
  if (!snapshot.value) return '';
  const binding = scopeBindings.value[snapshot.value.sourceScopeId];
  if (binding) {
    return binding.displayName || binding.ownerKey || snapshot.value.sourceScopeId.slice(0, 8);
  }
  return snapshot.value.sourceScopeId.slice(0, 8);
});

const payloadTitle = computed(() => {
  return snapshot.value?.payload?.item?.title ?? snapshot.value?.title ?? '';
});

const payloadContent = computed(() => {
  return snapshot.value?.payload?.item?.content ?? '';
});

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

async function copyContent() {
  const content = payloadContent.value;
  if (!content) return;
  try {
    await navigator.clipboard.writeText(content);
    toastr?.success('已复制');
  } catch {
    toastr?.error('复制失败');
  }
}

async function removeFavorite() {
  if (!snapshot.value) return;
  if (!confirm('确定取消收藏吗？')) return;
  try {
    await deleteSnapshot(
      snapshot.value.sourceScopeId,
      snapshot.value.contentType,
      snapshot.value.entityId,
    );
    toastr?.success('已取消收藏');
    navStore.back();
  } catch (e) {
    toastr?.error('操作失败');
  }
}

async function load() {
  loading.value = true;
  const rawKey = decodeURIComponent(navStore.currentNav?.params?.key ?? '');
  if (!rawKey) {
    loading.value = false;
    return;
  }

  try {
    const index = await loadIndex();
    scopeBindings.value = index.scopeBindings;
  } catch {
    scopeBindings.value = {};
  }

  const allSnapshots = await loadAllSnapshots();
  snapshot.value = allSnapshots.find((s) => s.key === rawKey) ?? null;
  loading.value = false;
}

onMounted(() => load());
</script>
