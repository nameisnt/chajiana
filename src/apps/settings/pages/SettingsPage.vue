<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">设置</h2>

    <!-- ====== 1. 数据统计 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('stats')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-chart-pie text-[var(--pc-accent)]"></i>
          <span class="font-semibold">数据统计</span>
        </div>
        <i :class="sections.stats ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.stats" class="pc-glass-card p-4 mb-3 flex flex-col gap-2">
      <div v-if="statsLoading" class="text-center text-secondary py-4">加载中...</div>
      <div v-else-if="stats.length === 0" class="text-center text-secondary py-4">暂无数据</div>
      <div v-else v-for="stat in stats" :key="stat.label" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i :class="stat.icon" class="text-secondary text-sm"></i>
          <span class="text-sm">{{ stat.label }}</span>
        </div>
        <span class="text-sm font-semibold">{{ stat.count }}</span>
      </div>
    </div>

    <!-- ====== 2. 数据操作 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('dataOps')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-database text-[var(--pc-accent)]"></i>
          <span class="font-semibold">数据操作</span>
        </div>
        <i :class="sections.dataOps ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.dataOps" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div>
        <button class="pc-btn text-sm w-full" @click="doExport">
          <i class="fa-solid fa-file-zipper mr-1"></i>导出 ZIP 备份
        </button>
      </div>
      <div>
        <label class="block text-sm mb-1">导入 ZIP 备份</label>
        <input
          type="file"
          accept=".zip"
          class="pc-input text-sm"
          @change="onImportFile"
        />
        <p v-if="importError" class="text-xs text-red-400 mt-1">{{ importError }}</p>
      </div>
      <div>
        <button class="pc-btn pc-btn-secondary text-sm w-full !text-red-400 !border-red-400" @click="clearCurrentData">
          <i class="fa-solid fa-trash-can mr-1"></i>清空当前聊天数据
        </button>
      </div>
    </div>

    <!-- ====== 3. 生成默认值 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('genDefaults')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-sliders text-[var(--pc-accent)]"></i>
          <span class="font-semibold">生成默认值</span>
        </div>
        <i :class="sections.genDefaults ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.genDefaults" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div>
        <label class="text-sm block mb-1">默认来源模式</label>
        <select v-model="genDefaults.sourceMode" class="pc-input text-sm">
          <option value="latest">最新</option>
          <option value="fromStart">从头开始</option>
          <option value="all">全部</option>
          <option value="single">单层</option>
          <option value="recent">最近</option>
          <option value="range">范围</option>
        </select>
      </div>
      <div>
        <label class="text-sm block mb-1">默认结果模式</label>
        <select v-model="genDefaults.resultMode" class="pc-input text-sm">
          <option value="preview">预览</option>
          <option value="save">直接保存</option>
        </select>
      </div>
      <div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" v-model="genDefaults.stream" />
          默认启用流式传输
        </label>
      </div>
      <button class="pc-btn text-sm" @click="saveGenDefaults">保存默认值</button>
    </div>

    <!-- ====== 4. 外观 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('appearance')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-palette text-[var(--pc-accent)]"></i>
          <span class="font-semibold">外观</span>
        </div>
        <i :class="sections.appearance ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.appearance" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <span>暗色模式</span>
          <input type="checkbox" :checked="themeStore.theme === 'dark'" @change="themeStore.toggleTheme()" />
        </label>
      </div>
      <div>
        <label class="text-sm block mb-1">字体</label>
        <input
          v-model="appearanceFontFamily"
          class="pc-input text-sm"
          placeholder="例如: -apple-system, sans-serif"
          @change="applyAppearanceFont"
        />
      </div>
      <div>
        <label class="text-sm block mb-1">字号</label>
        <input
          v-model.number="appearanceFontSize"
          type="number"
          class="pc-input text-sm"
          min="10"
          max="24"
          step="1"
          @change="applyAppearanceFont"
        />
      </div>
    </div>

    <!-- ====== 5. 阅读器 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('reader')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-book-open text-[var(--pc-accent)]"></i>
          <span class="font-semibold">阅读器</span>
        </div>
        <i :class="sections.reader ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.reader" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div>
        <label class="text-sm block mb-1">字体大小 ({{ readerFontSize }}px)</label>
        <input
          v-model.number="readerFontSize"
          type="range"
          min="12"
          max="24"
          step="1"
          @change="applyReaderSettings"
        />
      </div>
      <div>
        <label class="text-sm block mb-1">行高 ({{ readerLineHeight }})</label>
        <input
          v-model.number="readerLineHeight"
          type="range"
          min="1.2"
          max="2.0"
          step="0.1"
          @change="applyReaderSettings"
        />
      </div>
      <button class="pc-btn pc-btn-secondary text-sm" @click="resetReaderSettings">恢复默认</button>
    </div>

    <!-- ====== 6. 文本通道 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('textChannel')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-cloud text-[var(--pc-accent)]"></i>
          <span class="font-semibold">文本通道</span>
        </div>
        <i :class="sections.textChannel ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.textChannel" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div>
        <label class="text-sm block mb-1">通道模式</label>
        <div class="flex gap-2">
          <button
            class="pc-btn text-sm flex-1"
            :class="textChannel.mode === 'tavern' ? '' : 'pc-btn-secondary'"
            @click="textChannel.mode = 'tavern'; saveTextChannel()"
          >
            酒馆
          </button>
          <button
            class="pc-btn text-sm flex-1"
            :class="textChannel.mode === 'external' ? '' : 'pc-btn-secondary'"
            @click="textChannel.mode = 'external'; saveTextChannel()"
          >
            外部 API
          </button>
        </div>
      </div>
      <template v-if="textChannel.mode === 'external'">
        <div>
          <label class="text-sm block mb-1">外部 API URL</label>
          <input
            v-model="textChannel.apiUrl"
            class="pc-input text-sm"
            placeholder="https://api.example.com/v1"
            @change="saveTextChannel"
          />
        </div>
        <div>
          <label class="text-sm block mb-1">API Key</label>
          <input
            v-model="textChannel.apiKey"
            type="password"
            class="pc-input text-sm"
            placeholder="sk-..."
            @change="saveTextChannel"
          />
        </div>
        <div>
          <label class="text-sm block mb-1">模型</label>
          <input
            v-model="textChannel.model"
            class="pc-input text-sm"
            placeholder="gpt-4o"
            @change="saveTextChannel"
          />
        </div>
        <div>
          <button class="pc-btn pc-btn-secondary text-sm" :disabled="testingConnection" @click="testConnection">
            <i :class="testingConnection ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug'" class="mr-1"></i>
            {{ testingConnection ? '测试中...' : '测试连接' }}
          </button>
          <p v-if="connectionResult" class="text-xs mt-1" :class="connectionOk ? 'text-green-500' : 'text-red-400'">
            {{ connectionResult }}
          </p>
        </div>
      </template>
    </div>

    <!-- ====== 7. 悬浮球 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('floatBall')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-dot text-[var(--pc-accent)]"></i>
          <span class="font-semibold">悬浮球</span>
        </div>
        <i :class="sections.floatBall ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.floatBall" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" v-model="floatBallSettings.floatBallEnabled" @change="saveFloatBall" />
          启用悬浮球
        </label>
      </div>
      <div>
        <label class="text-sm block mb-1">大小 ({{ floatBallSettings.floatBallSize }}px)</label>
        <input
          v-model.number="floatBallSettings.floatBallSize"
          type="range"
          min="28"
          max="80"
          step="4"
          @change="saveFloatBall"
        />
      </div>
      <div>
        <label class="text-sm block mb-1">颜色</label>
        <div class="flex items-center gap-2">
          <input
            v-model="floatBallSettings.floatBallColor"
            type="color"
            class="w-10 h-10 rounded border-0 cursor-pointer"
            @change="saveFloatBall"
          />
          <span class="text-sm text-secondary">{{ floatBallSettings.floatBallColor }}</span>
        </div>
      </div>
    </div>

    <!-- ====== 8. 主屏布局 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('layout')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-grid-2 text-[var(--pc-accent)]"></i>
          <span class="font-semibold">主屏布局</span>
        </div>
        <i :class="sections.layout ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.layout" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div v-for="app in builtinApps" :key="app.id" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i :class="app.icon" class="text-secondary text-sm w-5 text-center"></i>
          <span class="text-sm">{{ app.name }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs px-2 py-1 rounded"
            :class="isAppVisible(app.id) ? 'bg-[var(--pc-accent)] text-white' : 'bg-[var(--pc-border)] text-secondary'"
            @click="layoutStore.toggleAppVisibility(app.id)"
          >
            可见
          </button>
          <button
            class="text-xs px-2 py-1 rounded"
            :class="isAppDocked(app.id) ? 'bg-[var(--pc-accent)] text-white' : 'bg-[var(--pc-border)] text-secondary'"
            @click="layoutStore.toggleDock(app.id)"
          >
            停靠
          </button>
        </div>
      </div>
      <button class="pc-btn pc-btn-secondary text-sm" @click="layoutStore.resetLayout()">
        <i class="fa-solid fa-rotate-left mr-1"></i>重置布局
      </button>
    </div>

    <!-- ====== 9. 数据恢复 ====== -->
    <div class="pc-glass-card p-4 mb-3 cursor-pointer" @click="toggleSection('recoveries')">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation text-[var(--pc-accent)]"></i>
          <span class="font-semibold">数据恢复</span>
        </div>
        <i :class="sections.recoveries ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-secondary text-xs"></i>
      </div>
    </div>
    <div v-if="sections.recoveries" class="pc-glass-card p-4 mb-3 flex flex-col gap-3">
      <div v-if="recoveries.length === 0" class="text-center text-secondary py-4">
        没有待处理的恢复项
      </div>
      <div v-else>
        <div
          v-for="rec in recoveries"
          :key="rec.scopeId"
          class="flex items-center justify-between py-2 border-b border-[var(--pc-border)] last:border-b-0"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate">Scope: {{ rec.scopeId.slice(0, 8) }}...</p>
            <p class="text-xs text-secondary">
              {{ rec.createdAt.slice(0, 16).replace('T', ' ') }} · {{ rec.messages.length }} 条消息
            </p>
          </div>
          <button class="text-xs text-red-400 ml-2" @click="removeRecovery(rec.scopeId)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme';
import { useHomeLayoutStore } from '@/stores/home-layout';
import { loadChatData, clearChatData } from '@/repositories/data-repository';
import { downloadBlob } from '@/repositories/import-export';
import { testExternalApiConnection } from '@/services/text-channel';
import { updateFloatBallStyle } from '@/core/float-ball';
import { BUILTIN_APPS } from '@/constants/app-defaults';
import type {
  ChatDomainId,
  TheaterScopeData,
  FloatBallSettings,
  TextProvider,
  PendingVisibilityRecovery,
} from '@/types';

// ========== Stores ==========
const themeStore = useThemeStore();
const layoutStore = useHomeLayoutStore();
const builtinApps = BUILTIN_APPS;

function isAppVisible(appId: string): boolean {
  return !layoutStore.layout.value.hiddenApps.includes(appId);
}

function isAppDocked(appId: string): boolean {
  return layoutStore.layout.value.dockApps.includes(appId);
}

// ========== Section toggle ==========
const sections = reactive<Record<string, boolean>>({
  stats: false,
  dataOps: false,
  genDefaults: false,
  appearance: false,
  reader: false,
  textChannel: false,
  floatBall: false,
  layout: false,
  recoveries: false,
});

function toggleSection(key: string) {
  sections[key] = !sections[key];
}

// ========== 1. 数据统计 ==========
interface ContentStat {
  label: string;
  icon: string;
  count: string;
}

const stats = ref<ContentStat[]>([]);
const statsLoading = ref(false);

async function loadStats() {
  statsLoading.value = true;
  const types: Array<{ domain: ChatDomainId; label: string; icon: string }> = [
    { domain: 'diary', label: '日记', icon: 'fa-solid fa-book' },
    { domain: 'forum', label: '论坛', icon: 'fa-solid fa-comments' },
    { domain: 'extras', label: '番外', icon: 'fa-solid fa-feather' },
    { domain: 'theater', label: '小剧场', icon: 'fa-solid fa-masks-theater' },
    { domain: 'letters', label: '书信', icon: 'fa-solid fa-envelope' },
    { domain: 'summaries', label: '总结', icon: 'fa-solid fa-list-check' },
  ];

  const result: ContentStat[] = [];

  for (const { domain, label, icon } of types) {
    try {
      const data = await loadChatData<Record<string, unknown>>('current', domain);
      if (!data) {
        result.push({ label, icon, count: '0' });
        continue;
      }

      let count = 0;
      if (domain === 'theater') {
        const theaterData = data as unknown as TheaterScopeData;
        count = theaterData?.entries?.length ?? 0;
      } else {
        const genericData = data as { books?: unknown[] };
        count = genericData?.books?.length ?? 0;
      }
      result.push({ label, icon, count: String(count) });
    } catch {
      result.push({ label, icon, count: '?' });
    }
  }

  stats.value = result;
  statsLoading.value = false;
}

// ========== 2. 数据操作 ==========
const importError = ref('');

async function doExport() {
  try {
    const mod = await import('@/repositories/import-export');
    const { blob, fileName } = await mod.exportFullBackup();
    downloadBlob(blob, fileName);
    toastr?.success('备份已导出');
  } catch (err) {
    console.error('[设置] 导出失败:', err);
    toastr?.error('导出失败: ' + (err instanceof Error ? err.message : '未知错误'));
  }
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importError.value = '';

  if (!confirm('确定导入此备份吗？这将覆盖现有数据。')) {
    input.value = '';
    return;
  }

  try {
    const mod = await import('@/repositories/import-export');
    const result = await mod.importFullBackup(file);
    if (result.success) {
      toastr?.success('备份已成功导入');
      loadStats();
    } else {
      importError.value = result.error;
      toastr?.error('导入失败: ' + result.error);
    }
  } catch (err) {
    importError.value = err instanceof Error ? err.message : '导入失败';
    toastr?.error('导入失败');
  }

  input.value = '';
}

async function clearCurrentData() {
  if (!confirm('确定清空当前聊天的所有创作数据吗？此操作不可恢复。')) return;
  if (!confirm('再次确认：这将删除当前聊天的所有日记、论坛、番外、小剧场、书信、总结数据。确定继续吗？')) return;

  try {
    await clearChatData('current');
    toastr?.success('当前聊天数据已清空');
    loadStats();
  } catch (err) {
    console.error('[设置] 清空数据失败:', err);
    toastr?.error('清空数据失败');
  }
}

// ========== 3. 生成默认值 ==========
interface GenDefaultsStore {
  sourceMode: string;
  resultMode: string;
  stream: boolean;
}

const genDefaults = reactive<GenDefaultsStore>({
  sourceMode: 'latest',
  resultMode: 'save',
  stream: false,
});

function loadGenDefaults() {
  const saved = _.get(extension_settings, 'sillytavernPhone.defaults') as GenDefaultsStore | undefined;
  if (saved) {
    genDefaults.sourceMode = saved.sourceMode ?? 'latest';
    genDefaults.resultMode = saved.resultMode ?? 'save';
    genDefaults.stream = saved.stream ?? false;
  }
}

function saveGenDefaults() {
  _.set(extension_settings, 'sillytavernPhone.defaults', klona(toRaw(genDefaults)));
  saveSettingsDebounced();
  toastr?.success('默认值已保存');
}

// ========== 4. 外观 ==========
const appearanceFontFamily = ref('');
const appearanceFontSize = ref(14);

function loadAppearance() {
  appearanceFontFamily.value = (_.get(extension_settings, 'sillytavernPhone.fontFamily') as string) ?? '';
  appearanceFontSize.value = (_.get(extension_settings, 'sillytavernPhone.fontSize') as number) ?? 14;
}

function applyAppearanceFont() {
  _.set(extension_settings, 'sillytavernPhone.fontFamily', appearanceFontFamily.value);
  _.set(extension_settings, 'sillytavernPhone.fontSize', appearanceFontSize.value);
  saveSettingsDebounced();

  const root = document.getElementById('phone-creative-root');
  if (root) {
    const phoneRoot = root.querySelector<HTMLElement>('.phone-root');
    if (phoneRoot) {
      if (appearanceFontFamily.value) {
        phoneRoot.style.setProperty('--phone-font-sans', appearanceFontFamily.value);
      }
      phoneRoot.style.fontSize = appearanceFontSize.value + 'px';
    }
  }
}

// ========== 5. 阅读器 ==========
const readerFontSize = ref(14);
const readerLineHeight = ref(1.6);

function loadReaderSettings() {
  readerFontSize.value = (_.get(extension_settings, 'sillytavernPhone.reader.fontSize') as number) ?? 14;
  readerLineHeight.value = (_.get(extension_settings, 'sillytavernPhone.reader.lineHeight') as number) ?? 1.6;
}

function applyReaderSettings() {
  _.set(extension_settings, 'sillytavernPhone.reader.fontSize', readerFontSize.value);
  _.set(extension_settings, 'sillytavernPhone.reader.lineHeight', readerLineHeight.value);
  saveSettingsDebounced();
}

function resetReaderSettings() {
  readerFontSize.value = 14;
  readerLineHeight.value = 1.6;
  applyReaderSettings();
}

// ========== 6. 文本通道 ==========
const textChannel = reactive<{
  mode: 'tavern' | 'external';
  apiUrl: string;
  apiKey: string;
  model: string;
}>({
  mode: 'tavern',
  apiUrl: '',
  apiKey: '',
  model: '',
});

const testingConnection = ref(false);
const connectionResult = ref('');
const connectionOk = ref(false);

function loadTextChannel() {
  const saved = _.get(extension_settings, 'sillytavernPhone.textProvider') as TextProvider | undefined;
  if (saved) {
    if (saved.mode === 'external') {
      textChannel.mode = 'external';
      textChannel.apiUrl = saved.apiUrl ?? '';
      textChannel.apiKey = saved.apiKey ?? '';
      textChannel.model = saved.model ?? '';
    } else {
      textChannel.mode = 'tavern';
      textChannel.apiUrl = '';
      textChannel.apiKey = '';
      textChannel.model = '';
    }
  }
}

function saveTextChannel() {
  const provider: TextProvider =
    textChannel.mode === 'external'
      ? {
          mode: 'external',
          apiUrl: textChannel.apiUrl,
          apiKey: textChannel.apiKey || undefined,
          model: textChannel.model,
        }
      : { mode: 'tavern' };

  _.set(extension_settings, 'sillytavernPhone.textProvider', klona(provider));
  saveSettingsDebounced();
}

async function testConnection() {
  if (!textChannel.apiUrl.trim()) {
    toastr?.warning('请先填写 API URL');
    return;
  }

  testingConnection.value = true;
  connectionResult.value = '';
  connectionOk.value = false;

  try {
    const result = await testExternalApiConnection(textChannel.apiUrl, textChannel.apiKey || undefined);
    if (result.ok) {
      connectionOk.value = true;
      connectionResult.value = '连接成功！可用模型: ' + (result.models.join(', ') || '无');
      toastr?.success('外部 API 连接成功');
    } else {
      connectionOk.value = false;
      connectionResult.value = result.error;
      toastr?.error('连接失败: ' + result.error);
    }
  } finally {
    testingConnection.value = false;
  }
}

// ========== 7. 悬浮球 ==========
const floatBallSettings = reactive<FloatBallSettings>({
  floatBallEnabled: true,
  floatBallSize: 44,
  floatBallColor: '#007aff',
});

function loadFloatBall() {
  const saved = _.get(extension_settings, 'sillytavernPhone.floatBall') as FloatBallSettings | undefined;
  if (saved) {
    floatBallSettings.floatBallEnabled = saved.floatBallEnabled ?? true;
    floatBallSettings.floatBallSize = saved.floatBallSize ?? 44;
    floatBallSettings.floatBallColor = saved.floatBallColor ?? '#007aff';
  }
}

function saveFloatBall() {
  _.set(extension_settings, 'sillytavernPhone.floatBall', klona(toRaw(floatBallSettings)));
  saveSettingsDebounced();
  updateFloatBallStyle();
}

// ========== 9. 数据恢复 ==========
interface RecoveryDisplay {
  scopeId: string;
  createdAt: string;
  messages: PendingVisibilityRecovery['messages'];
}

const recoveries = ref<RecoveryDisplay[]>([]);

function loadRecoveries() {
  const pending = _.get(extension_settings, 'sillytavernPhone.pendingVisibilityRecoveries') as
    | Record<string, PendingVisibilityRecovery>
    | undefined;

  if (pending) {
    recoveries.value = Object.entries(pending).map(([scopeId, rec]) => ({
      scopeId,
      createdAt: rec.createdAt,
      messages: rec.messages,
    }));
  } else {
    recoveries.value = [];
  }
}

function removeRecovery(scopeId: string) {
  if (!confirm('确定删除此恢复项吗？')) return;

  const pending = _.get(extension_settings, 'sillytavernPhone.pendingVisibilityRecoveries') as
    | Record<string, PendingVisibilityRecovery>
    | undefined;

  if (pending) {
    delete pending[scopeId];
    _.set(extension_settings, 'sillytavernPhone.pendingVisibilityRecoveries', pending);
    saveSettingsDebounced();
  }

  recoveries.value = recoveries.value.filter((r) => r.scopeId !== scopeId);
}

// ========== Initialization ==========
onMounted(() => {
  loadStats();
  loadGenDefaults();
  loadAppearance();
  loadReaderSettings();
  loadTextChannel();
  loadFloatBall();
  loadRecoveries();
  applyAppearanceFont();
});
</script>
