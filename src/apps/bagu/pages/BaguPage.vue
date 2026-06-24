<template>
  <div class="app-page">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-bold">八股去除</h2>
      <div class="flex gap-2">
        <button class="pc-btn pc-btn-secondary text-sm" @click="restoreDefaults">
          <i class="fa-solid fa-rotate-left mr-1"></i>恢复默认
        </button>
        <button class="pc-btn text-sm" @click="showAddForm = true">
          <i class="fa-solid fa-plus mr-1"></i>添加规则
        </button>
      </div>
    </div>

    <!-- 过滤 -->
    <div class="flex gap-2 mb-3">
      <button
        class="pc-btn pc-btn-secondary text-xs"
        :class="{ '!bg-[var(--pc-accent)] !text-white': filterStatus === 'all' }"
        @click="filterStatus = 'all'"
      >
        全部
      </button>
      <button
        class="pc-btn pc-btn-secondary text-xs"
        :class="{ '!bg-[var(--pc-accent)] !text-white': filterStatus === 'enabled' }"
        @click="filterStatus = 'enabled'"
      >
        已启用
      </button>
      <button
        class="pc-btn pc-btn-secondary text-xs"
        :class="{ '!bg-[var(--pc-accent)] !text-white': filterStatus === 'disabled' }"
        @click="filterStatus = 'disabled'"
      >
        已禁用
      </button>
    </div>

    <!-- 添加/编辑表单 -->
    <div v-if="showAddForm" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <h3 class="font-semibold text-sm">{{ editingRule ? '编辑规则' : '添加规则' }}</h3>
      <div class="flex gap-2">
        <select v-model="formType" class="pc-input" style="max-width: 100px">
          <option value="word">词汇</option>
          <option value="pattern">句式</option>
        </select>
        <input
          v-model="formFind"
          class="pc-input flex-1"
          placeholder="查找（正则）"
        />
      </div>
      <input
        v-model="formReplace"
        class="pc-input"
        placeholder="替换为（留空即删除）"
      />
      <textarea
        v-model="formDescription"
        class="pc-textarea"
        placeholder="描述（可选）"
        style="min-height: 50px"
      ></textarea>
      <div class="flex gap-2 justify-end">
        <button class="pc-btn pc-btn-secondary text-sm" @click="cancelForm">取消</button>
        <button class="pc-btn text-sm" @click="saveRule">保存</button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-secondary py-8">加载中...</div>
    <div v-else-if="filteredRules.length === 0" class="text-center text-secondary py-8">
      <p>暂无规则</p>
    </div>
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="rule in filteredRules"
        :key="rule.id"
        class="pc-glass-card p-3 flex items-center gap-3"
      >
        <!-- Enable toggle -->
        <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            :checked="rule.enabled"
            @change="toggleRule(rule)"
            class="sr-only peer"
          />
          <div
            class="w-10 h-5 rounded-full transition-colors"
            :class="rule.enabled ? 'bg-[var(--pc-accent)]' : 'bg-[var(--pc-border)]'"
          ></div>
          <div
            class="absolute w-4 h-4 bg-white rounded-full top-0.5 left-0.5 transition-transform shadow"
            :class="rule.enabled ? 'translate-x-5' : ''"
          ></div>
        </label>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="rule.type === 'word' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
            >
              {{ rule.type === 'word' ? '词汇' : '句式' }}
            </span>
            <span class="text-xs text-secondary truncate">{{ rule.description || '' }}</span>
          </div>
          <p class="text-xs text-secondary truncate">
            查找: <code class="text-[var(--pc-accent)]">{{ rule.find }}</code>
            <span v-if="rule.replace">&rarr; 替换: <code class="text-green-600">{{ rule.replace }}</code></span>
            <span v-else class="text-red-400">&rarr; 删除</span>
          </p>
        </div>

        <div class="flex gap-1 flex-shrink-0">
          <button class="text-xs text-[var(--pc-accent)]" @click="editRule(rule)">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="text-xs text-red-400" @click="deleteRule(rule.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { loadGlobalData, saveGlobalData } from '@/repositories/data-repository';
import { DEFAULT_BAGU_RULES } from '@/constants/bagu-rules';
import type { BaguRule } from '@/types';

const DOMAIN = 'bagu-rules' as const;

const rules = ref<BaguRule[]>([]);
const loading = ref(true);
const filterStatus = ref<'all' | 'enabled' | 'disabled'>('all');
const showAddForm = ref(false);
const editingRuleId = ref<string | null>(null);

const formType = ref<BaguRule['type']>('word');
const formFind = ref('');
const formReplace = ref('');
const formDescription = ref('');

const filteredRules = computed(() => {
  if (filterStatus.value === 'enabled') {
    return rules.value.filter((r) => r.enabled);
  }
  if (filterStatus.value === 'disabled') {
    return rules.value.filter((r) => !r.enabled);
  }
  return rules.value;
});

const editingRule = computed(() => {
  if (!editingRuleId.value) return null;
  return rules.value.find((r) => r.id === editingRuleId.value) ?? null;
});

async function load() {
  loading.value = true;
  const data = await loadGlobalData<BaguRule[]>(DOMAIN);
  if (data && Array.isArray(data) && data.length > 0) {
    rules.value = data;
  } else {
    rules.value = klona(DEFAULT_BAGU_RULES);
  }
  loading.value = false;
}

async function persist() {
  await saveGlobalData(DOMAIN, toRaw(rules.value));
}

function toggleRule(rule: BaguRule) {
  rule.enabled = !rule.enabled;
  rule.updatedAt = new Date().toISOString();
  persist();
}

function editRule(rule: BaguRule) {
  editingRuleId.value = rule.id;
  formType.value = rule.type;
  formFind.value = rule.find;
  formReplace.value = rule.replace;
  formDescription.value = rule.description ?? '';
  showAddForm.value = true;
}

function cancelForm() {
  showAddForm.value = false;
  editingRuleId.value = null;
  formType.value = 'word';
  formFind.value = '';
  formReplace.value = '';
  formDescription.value = '';
}

async function saveRule() {
  if (!formFind.value.trim()) {
    toastr?.warning('请填写查找规则');
    return;
  }

  const now = new Date().toISOString();

  if (editingRuleId.value) {
    const idx = rules.value.findIndex((r) => r.id === editingRuleId.value);
    if (idx >= 0) {
      rules.value[idx] = {
        ...rules.value[idx],
        type: formType.value,
        find: formFind.value.trim(),
        replace: formReplace.value.trim(),
        description: formDescription.value.trim() || undefined,
        updatedAt: now,
      };
    }
  } else {
    const newRule: BaguRule = {
      id: crypto.randomUUID(),
      type: formType.value,
      find: formFind.value.trim(),
      replace: formReplace.value.trim(),
      enabled: false,
      description: formDescription.value.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    rules.value.push(newRule);
  }

  await persist();
  cancelForm();
}

async function deleteRule(id: string) {
  if (!confirm('确定删除此规则吗？')) return;
  rules.value = rules.value.filter((r) => r.id !== id);
  await persist();
}

async function restoreDefaults() {
  if (!confirm('将恢复默认规则。已有规则不会被覆盖，仅添加默认规则中缺失的项。确定继续吗？')) return;

  const existingIds = new Set(rules.value.map((r) => r.id));
  const newRules = klona(DEFAULT_BAGU_RULES).filter((r) => !existingIds.has(r.id));

  if (newRules.length === 0) {
    toastr?.info('所有默认规则已存在，无需恢复');
    return;
  }

  rules.value.push(...newRules);
  await persist();
  toastr?.success(`已添加 ${newRules.length} 条默认规则`);
}

onMounted(() => load());
</script>
