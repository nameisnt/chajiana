<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">提示词工坊</h2>

    <!-- Tab bar -->
    <div class="flex gap-1 mb-3 border-b border-gray-700">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-3 py-2 text-sm border-b-2 transition-colors"
        :class="activeTab === tab.key ? 'border-blue-400 text-blue-300' : 'border-transparent text-secondary hover:text-white'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ==================== Tab: App Prompts ==================== -->
    <div v-if="activeTab === 'app'" class="flex flex-col gap-4">
      <div v-for="ct in contentTypes" :key="ct.key" class="pc-glass-card p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-sm">{{ ct.label }}</h3>
          <span class="text-xs text-secondary">{{ ct.appId }} {{ ct.key }}</span>
        </div>
        <textarea
          v-model="appPrompts[ct.key]"
          class="pc-textarea w-full text-sm mb-2"
          rows="4"
          :placeholder="ct.placeholder"
        ></textarea>
        <details class="text-xs">
          <summary class="text-secondary cursor-pointer">查看 XML 输出格式</summary>
          <pre class="pc-glass-card p-2 mt-1 text-xs overflow-auto max-h-32">{{ xmlFormatForContentType(ct.key) }}</pre>
        </details>
      </div>

      <!-- Special prompts -->
      <div class="pc-glass-card p-4">
        <h3 class="font-semibold text-sm mb-2">日记阅读反应 (diaryReaction)</h3>
        <textarea
          v-model="specialPrompts.diaryReaction"
          class="pc-textarea w-full text-sm mb-2"
          rows="3"
          placeholder="阅读反应提示词..."
        ></textarea>
        <details class="text-xs">
          <summary class="text-secondary cursor-pointer">查看 XML 输出格式</summary>
          <pre class="pc-glass-card p-2 mt-1 text-xs overflow-auto max-h-32">{{ xmlFormatForContentType('diary') }}</pre>
        </details>
      </div>

      <div class="pc-glass-card p-4">
        <h3 class="font-semibold text-sm mb-2">番外总结 (extraSummary)</h3>
        <textarea
          v-model="specialPrompts.extraSummary"
          class="pc-textarea w-full text-sm mb-2"
          rows="3"
          placeholder="番外总结提示词..."
        ></textarea>
        <details class="text-xs">
          <summary class="text-secondary cursor-pointer">查看 XML 输出格式</summary>
          <pre class="pc-glass-card p-2 mt-1 text-xs overflow-auto max-h-32">{{ xmlFormatForContentType('extras') }}</pre>
        </details>
      </div>

      <button class="pc-btn text-sm" @click="saveAppPrompts">保存 App 提示词</button>
    </div>

    <!-- ==================== Tab: Type Prompts ==================== -->
    <div v-if="activeTab === 'type'" class="flex flex-col gap-3">
      <div class="flex gap-2 items-center mb-2">
        <select v-model="typePromptDomain" class="pc-input text-sm">
          <option value="extras">番外 (extras)</option>
          <option value="theater">小剧场 (theater)</option>
        </select>
        <button class="pc-btn pc-btn-secondary text-sm" @click="showTypeAdd = true">
          <i class="fa-solid fa-plus mr-1"></i> 新增
        </button>
      </div>

      <!-- Add/Edit type prompt form -->
      <div v-if="showTypeAdd" class="pc-glass-card p-4">
        <h4 class="font-semibold text-sm mb-2">{{ editingType ? '编辑' : '新增' }}类型提示词</h4>
        <input v-model="typeForm.name" class="pc-input w-full mb-2 text-sm" placeholder="类型名称" />
        <input v-model="typeForm.domain" class="pc-input w-full mb-2 text-sm" placeholder="domain (extras/theater)" />
        <textarea v-model="typeForm.prompt" class="pc-textarea w-full text-sm mb-2" rows="4" placeholder="提示词内容 (可用 {{char}} / {{user}} 占位)"></textarea>
        <div v-if="typeForm.prompt" class="pc-glass-card p-2 mb-2 text-xs">
          <p class="text-secondary mb-1">预览:</p>
          <p class="whitespace-pre-wrap">{{ previewTypePrompt(typeForm.prompt) }}</p>
        </div>
        <div class="flex gap-2">
          <button class="pc-btn text-sm" @click="saveTypePrompt">保存</button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="cancelTypeEdit">取消</button>
        </div>
      </div>

      <!-- Type prompt list -->
      <div v-if="filteredTypePrompts.length === 0" class="text-center text-secondary py-4">
        <p>暂无此类型的自定义提示词</p>
      </div>
      <div
        v-for="tp in filteredTypePrompts"
        :key="tp.id"
        class="pc-glass-card p-3"
      >
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-semibold text-sm">{{ tp.name }}</h4>
          <span class="text-xs text-secondary">{{ tp.domain }} · 使用 {{ tp.usageCount }} 次</span>
        </div>
        <p class="text-xs text-secondary mb-2 line-clamp-2">{{ tp.prompt }}</p>
        <div class="flex gap-2">
          <button class="text-xs text-blue-400" @click="editTypePrompt(tp)">编辑</button>
          <button class="text-xs text-red-400" @click="deleteTypePrompt(tp.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- ==================== Tab: Quick Phrases ==================== -->
    <div v-if="activeTab === 'quick'" class="flex flex-col gap-3">
      <div class="flex gap-2 items-center mb-2">
        <button class="pc-btn pc-btn-secondary text-sm" @click="showGroupAdd = true">
          <i class="fa-solid fa-plus mr-1"></i> 新增分组
        </button>
      </div>

      <!-- Add/Edit group form -->
      <div v-if="showGroupAdd" class="pc-glass-card p-4">
        <h4 class="font-semibold text-sm mb-2">{{ editingGroup ? '编辑' : '新增' }}短语分组</h4>
        <input v-model="groupForm.name" class="pc-input w-full mb-2 text-sm" placeholder="分组名称" />
        <div class="flex gap-2 mb-2">
          <input v-model="phraseInput" class="pc-input flex-1 text-sm" placeholder="输入短语" @keyup.enter="addPhraseToGroup" />
          <button class="pc-btn pc-btn-secondary text-sm shrink-0" @click="addPhraseToGroup">添加</button>
        </div>
        <!-- Phrase list in form -->
        <div v-if="groupForm.phrases.length > 0" class="flex flex-col gap-1 mb-2">
          <div
            v-for="(p, idx) in groupForm.phrases"
            :key="idx"
            class="flex items-center gap-2 text-sm"
          >
            <span class="flex-1 truncate">{{ p.text }}</span>
            <button class="text-xs text-red-400 shrink-0" @click="groupForm.phrases.splice(idx, 1)">移除</button>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="pc-btn text-sm" @click="saveGroup">保存</button>
          <button class="pc-btn pc-btn-secondary text-sm" @click="cancelGroupEdit">取消</button>
        </div>
      </div>

      <!-- Quick phrase groups -->
      <div v-if="quickPhraseGroups.length === 0" class="text-center text-secondary py-4">
        <p>暂无快速短语分组</p>
      </div>
      <div v-for="g in quickPhraseGroups" :key="g.id" class="pc-glass-card">
        <div class="flex items-center justify-between p-3 cursor-pointer" @click="toggleGroup(g.id)">
          <div class="flex items-center gap-2">
            <i :class="expandedGroups.has(g.id) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'" class="text-xs text-secondary"></i>
            <h4 class="font-semibold text-sm">{{ g.name }}</h4>
            <span class="text-xs text-secondary">({{ g.phrases.length }})</span>
          </div>
          <div class="flex gap-2">
            <button class="text-xs text-blue-400" @click.stop="editGroup(g)">编辑</button>
            <button class="text-xs text-red-400" @click.stop="deleteGroup(g.id)">删除</button>
          </div>
        </div>
        <!-- Expanded phrase list -->
        <div v-if="expandedGroups.has(g.id)" class="border-t border-gray-700 p-3 flex flex-col gap-2">
          <div
            v-for="p in g.phrases"
            :key="p.id"
            class="pc-glass-card p-2 text-sm flex items-center justify-between"
          >
            <span class="flex-1 truncate mr-2">{{ p.text }}</span>
            <div class="flex gap-2 shrink-0">
              <button class="text-xs text-blue-400" @click="copyPhrase(p.text)">复制</button>
              <button class="text-xs text-red-400" @click="removePhraseFromGroup(g.id, p.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { loadGlobalData, saveGlobalData } from '@/repositories/data-repository';
import { DEFAULT_APP_PROMPTS, DEFAULT_SPECIAL_PROMPTS, DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';
import { APP_XML_FORMATS, XML_FORMAT_BASIC } from '@/constants/xml-formats';
import type { PromptSettingsData, TypePromptConfig, QuickPhraseGroup } from '@/types';

const navStore = useNavigationStore();

const PROMPT_DOMAIN = 'prompt-settings' as const;

// --- Tabs ---
const tabs = [
  { key: 'app' as const, label: 'App 提示词' },
  { key: 'type' as const, label: '类型提示词' },
  { key: 'quick' as const, label: '快速短语' },
];
const activeTab = ref<'app' | 'type' | 'quick'>('app');

// --- Content types ---
const contentTypes = [
  { key: 'diary' as const, label: '日记', appId: 'diary', placeholder: '' },
  { key: 'forum' as const, label: '论坛', appId: 'forum', placeholder: '' },
  { key: 'extras' as const, label: '番外', appId: 'extras', placeholder: '' },
  { key: 'theater' as const, label: '小剧场', appId: 'theater', placeholder: '' },
  { key: 'letters' as const, label: '书信', appId: 'letters', placeholder: '' },
  { key: 'summaries' as const, label: '总结', appId: 'summary', placeholder: '' },
];

// --- App prompts data ---
const appPrompts = ref<Record<string, string>>({});
const specialPrompts = ref<Record<string, string>>({});

function xmlFormatForContentType(contentType: string): string {
  const fn = APP_XML_FORMATS[contentType];
  if (fn) {
    return fn('normal');
  }
  return XML_FORMAT_BASIC;
}

async function saveAppPrompts() {
  try {
    const current = await loadGlobalData<PromptSettingsData>(PROMPT_DOMAIN);
    const updated: PromptSettingsData = {
      appPrompts: {
        diary: appPrompts.value.diary ?? DEFAULT_APP_PROMPTS.diary,
        forum: appPrompts.value.forum ?? DEFAULT_APP_PROMPTS.forum,
        extras: appPrompts.value.extras ?? DEFAULT_APP_PROMPTS.extras,
        theater: appPrompts.value.theater ?? DEFAULT_APP_PROMPTS.theater,
        letters: appPrompts.value.letters ?? DEFAULT_APP_PROMPTS.letters,
        summaries: appPrompts.value.summaries ?? DEFAULT_APP_PROMPTS.summaries,
      },
      specialPrompts: {
        diaryReaction: specialPrompts.value.diaryReaction ?? DEFAULT_SPECIAL_PROMPTS.diaryReaction,
        extraSummary: specialPrompts.value.extraSummary ?? DEFAULT_SPECIAL_PROMPTS.extraSummary,
      },
      typePrompts: current?.typePrompts ?? [],
      quickPhraseGroups: current?.quickPhraseGroups ?? [],
    };
    await saveGlobalData(PROMPT_DOMAIN, updated);
    toastr?.success('已保存 App 提示词');
    await loadData();
  } catch (e) {
    toastr?.error('保存失败');
  }
}

// --- Type prompts ---
const typePrompts = ref<TypePromptConfig[]>([]);
const typePromptDomain = ref('extras');
const showTypeAdd = ref(false);
const editingType = ref<TypePromptConfig | null>(null);
const typeForm = reactive({ name: '', domain: 'extras', prompt: '' });

const filteredTypePrompts = computed(() => {
  return typePrompts.value.filter((tp) => tp.domain === typePromptDomain.value);
});

function previewTypePrompt(prompt: string): string {
  const charName = window.TavernHelper?.character?.getCurrentCharacterName?.() ?? '{{char}}';
  const userName = t`{{user}}` || '{{user}}';
  return prompt.replace(/\{\{char\}\}/g, charName).replace(/\{\{user\}\}/g, userName);
}

function editTypePrompt(tp: TypePromptConfig) {
  editingType.value = tp;
  typeForm.name = tp.name;
  typeForm.domain = tp.domain;
  typeForm.prompt = tp.prompt;
  showTypeAdd.value = true;
}

function cancelTypeEdit() {
  showTypeAdd.value = false;
  editingType.value = null;
  typeForm.name = '';
  typeForm.domain = 'extras';
  typeForm.prompt = '';
}

async function saveTypePrompt() {
  if (!typeForm.name.trim()) return;
  const now = new Date().toISOString();

  if (editingType.value) {
    const idx = typePrompts.value.findIndex((tp) => tp.id === editingType.value!.id);
    if (idx >= 0) {
      typePrompts.value[idx] = {
        ...typePrompts.value[idx],
        name: typeForm.name,
        domain: typeForm.domain as 'extras' | 'theater',
        prompt: typeForm.prompt,
        updatedAt: now,
      };
    }
  } else {
    const newType: TypePromptConfig = {
      id: crypto.randomUUID(),
      name: typeForm.name,
      domain: typeForm.domain as 'extras' | 'theater',
      prompt: typeForm.prompt,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    typePrompts.value.push(newType);
  }

  await persistSettings();
  toastr?.success('已保存类型提示词');
  cancelTypeEdit();
  await loadData();
}

async function deleteTypePrompt(id: string) {
  if (!confirm('确定删除此类型提示词？')) return;
  typePrompts.value = typePrompts.value.filter((tp) => tp.id !== id);
  await persistSettings();
  await loadData();
}

// --- Quick phrases ---
const quickPhraseGroups = ref<QuickPhraseGroup[]>([]);
const showGroupAdd = ref(false);
const editingGroup = ref<QuickPhraseGroup | null>(null);
const phraseInput = ref('');
const expandedGroups = ref(new Set<string>());

const groupForm = reactive<{ name: string; phrases: Array<{ id: string; text: string }> }>({
  name: '',
  phrases: [],
});

function toggleGroup(id: string) {
  if (expandedGroups.value.has(id)) {
    expandedGroups.value.delete(id);
  } else {
    expandedGroups.value.add(id);
  }
}

function addPhraseToGroup() {
  const text = phraseInput.value.trim();
  if (!text) return;
  groupForm.phrases.push({ id: crypto.randomUUID(), text });
  phraseInput.value = '';
}

function editGroup(g: QuickPhraseGroup) {
  editingGroup.value = g;
  groupForm.name = g.name;
  groupForm.phrases = g.phrases.map((p) => ({ ...p }));
  showGroupAdd.value = true;
}

function cancelGroupEdit() {
  showGroupAdd.value = false;
  editingGroup.value = null;
  groupForm.name = '';
  groupForm.phrases = [];
}

async function saveGroup() {
  if (!groupForm.name.trim()) return;

  if (editingGroup.value) {
    const idx = quickPhraseGroups.value.findIndex((g) => g.id === editingGroup.value!.id);
    if (idx >= 0) {
      quickPhraseGroups.value[idx] = {
        ...quickPhraseGroups.value[idx],
        name: groupForm.name,
        phrases: groupForm.phrases,
      };
    }
  } else {
    quickPhraseGroups.value.push({
      id: crypto.randomUUID(),
      name: groupForm.name,
      phrases: groupForm.phrases,
    });
  }

  await persistSettings();
  toastr?.success('已保存短语分组');
  cancelGroupEdit();
  await loadData();
}

async function deleteGroup(id: string) {
  if (!confirm('确定删除此短语分组？')) return;
  quickPhraseGroups.value = quickPhraseGroups.value.filter((g) => g.id !== id);
  expandedGroups.value.delete(id);
  await persistSettings();
  await loadData();
}

async function removePhraseFromGroup(groupId: string, phraseId: string) {
  const group = quickPhraseGroups.value.find((g) => g.id === groupId);
  if (group) {
    group.phrases = group.phrases.filter((p) => p.id !== phraseId);
    await persistSettings();
    await loadData();
  }
}

async function copyPhrase(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toastr?.success('已复制');
  } catch {
    toastr?.error('复制失败');
  }
}

// --- Persist helpers ---
async function persistSettings() {
  const data: PromptSettingsData = {
    appPrompts: {
      diary: appPrompts.value.diary ?? DEFAULT_APP_PROMPTS.diary,
      forum: appPrompts.value.forum ?? DEFAULT_APP_PROMPTS.forum,
      extras: appPrompts.value.extras ?? DEFAULT_APP_PROMPTS.extras,
      theater: appPrompts.value.theater ?? DEFAULT_APP_PROMPTS.theater,
      letters: appPrompts.value.letters ?? DEFAULT_APP_PROMPTS.letters,
      summaries: appPrompts.value.summaries ?? DEFAULT_APP_PROMPTS.summaries,
    },
    specialPrompts: {
      diaryReaction: specialPrompts.value.diaryReaction ?? DEFAULT_SPECIAL_PROMPTS.diaryReaction,
      extraSummary: specialPrompts.value.extraSummary ?? DEFAULT_SPECIAL_PROMPTS.extraSummary,
    },
    typePrompts: typePrompts.value,
    quickPhraseGroups: quickPhraseGroups.value,
  };
  await saveGlobalData(PROMPT_DOMAIN, data);
}

async function loadData() {
  const saved = await loadGlobalData<PromptSettingsData>(PROMPT_DOMAIN);

  // Load type prompts (merge defaults on first load)
  if (saved?.typePrompts && saved.typePrompts.length > 0) {
    typePrompts.value = saved.typePrompts;
  } else {
    // Load defaults
    const now = new Date().toISOString();
    typePrompts.value = [
      ...DEFAULT_TYPE_PROMPTS.extras.map((dt, i) => ({
        id: `default-extras-${i}`,
        domain: 'extras' as const,
        name: dt.name,
        prompt: dt.prompt,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })),
      ...DEFAULT_TYPE_PROMPTS.theater.map((dt, i) => ({
        id: `default-theater-${i}`,
        domain: 'theater' as const,
        name: dt.name,
        prompt: dt.prompt,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })),
    ];
  }

  // Load quick phrases
  quickPhraseGroups.value = saved?.quickPhraseGroups ?? [];
}

// --- Init ---
async function init() {
  // Load App prompts (use defaults if not saved)
  const saved = await loadGlobalData<PromptSettingsData>(PROMPT_DOMAIN);
  appPrompts.value = {
    diary: saved?.appPrompts?.diary ?? DEFAULT_APP_PROMPTS.diary,
    forum: saved?.appPrompts?.forum ?? DEFAULT_APP_PROMPTS.forum,
    extras: saved?.appPrompts?.extras ?? DEFAULT_APP_PROMPTS.extras,
    theater: saved?.appPrompts?.theater ?? DEFAULT_APP_PROMPTS.theater,
    letters: saved?.appPrompts?.letters ?? DEFAULT_APP_PROMPTS.letters,
    summaries: saved?.appPrompts?.summaries ?? DEFAULT_APP_PROMPTS.summaries,
  };
  specialPrompts.value = {
    diaryReaction: saved?.specialPrompts?.diaryReaction ?? DEFAULT_SPECIAL_PROMPTS.diaryReaction,
    extraSummary: saved?.specialPrompts?.extraSummary ?? DEFAULT_SPECIAL_PROMPTS.extraSummary,
  };

  // Load type prompts & quick phrases
  if (saved?.typePrompts && saved.typePrompts.length > 0) {
    typePrompts.value = saved.typePrompts;
  } else {
    const now = new Date().toISOString();
    typePrompts.value = [
      ...DEFAULT_TYPE_PROMPTS.extras.map((dt, i) => ({
        id: `default-extras-${i}`,
        domain: 'extras' as const,
        name: dt.name,
        prompt: dt.prompt,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })),
      ...DEFAULT_TYPE_PROMPTS.theater.map((dt, i) => ({
        id: `default-theater-${i}`,
        domain: 'theater' as const,
        name: dt.name,
        prompt: dt.prompt,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })),
    ];
  }

  quickPhraseGroups.value = saved?.quickPhraseGroups ?? [];
}

onMounted(() => init());
</script>
