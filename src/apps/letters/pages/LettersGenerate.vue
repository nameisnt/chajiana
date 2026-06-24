<template>
  <div class="app-page">
    <h2 class="text-lg font-bold mb-3">{{ isReply ? '回复信件' : '写新信' }}</h2>
    <div class="flex flex-col gap-3">
      <!-- 发信人 -->
      <div>
        <label class="text-sm font-medium mb-1 block">发信人</label>
        <input v-model="senderName" class="pc-input" placeholder="输入发信人名称" />
      </div>

      <!-- 收信人 -->
      <div>
        <label class="text-sm font-medium mb-1 block">收信人</label>
        <input v-model="receiverName" class="pc-input" placeholder="输入收信人名称" />
      </div>

      <!-- 信件格式 -->
      <div>
        <label class="text-sm font-medium mb-1 block">信件格式</label>
        <select v-model="letterFormat" class="pc-input">
          <option value="formal">正式信函</option>
          <option value="note">便条</option>
          <option value="sms">短信</option>
          <option value="email">邮件</option>
        </select>
      </div>

      <!-- 回复模式下显示最近信件数 -->
      <div v-if="isReply">
        <label class="text-sm font-medium mb-1 block">引用最近 N 封信件作为上下文</label>
        <input v-model.number="replyCountN" type="number" class="pc-input" min="1" max="20" />
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
        <input v-model="stream" type="checkbox" id="stream-l" />
        <label for="stream-l" class="text-sm">流式传输</label>
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
import { loadChatData } from '@/repositories/data-repository';
import type { LettersScopeData, LetterFormat } from '@/types';

const navStore = useNavigationStore();
const bookId = navStore.currentNav?.params?.bookId;
const modeParam = navStore.currentNav?.params?.mode ?? 'new';
const isReply = computed(() => modeParam === 'reply');

const senderName = ref('');
const receiverName = ref('');
const letterFormat = ref<LetterFormat>('formal');
const replyCountN = ref(5);
const sourceMode = ref<'latest' | 'all' | 'recent'>('latest');
const recentN = ref(5);
const resultMode = ref<'preview' | 'save'>('preview');
const stream = ref(false);
const generating = ref(false);
const previewText = ref('');

// 预填发信人/收信人（从已有 book 数据推断）
async function prefillFromBook() {
  if (!bookId) return;
  const data = await loadChatData<LettersScopeData>('current', 'letters');
  const book = data?.books.find((b) => b.id === bookId);
  if (book && book.participants.length >= 2) {
    senderName.value = book.participants[0].name;
    receiverName.value = book.participants[1].name;
  }
}

function getRecentLettersContext(): string {
  if (!bookId) return '';
  // 从已缓存的或导航数据中无法直接获取，先简单处理
  // 实际由 adapter 在 buildRequest 中处理 extraContext
  return '';
}

async function startGenerate() {
  if (!senderName.value.trim() || !receiverName.value.trim()) {
    toastr?.error('请填写发信人和收信人');
    return;
  }

  const actionId = isReply.value ? 'replyLetter' : 'newLetter';
  const adapter = getAdapter('letters', actionId);
  if (!adapter) { toastr?.error('未找到生成适配器'); return; }

  generating.value = true;
  previewText.value = '';

  try {
    // 回复模式：获取最近 N 封信件作为上下文
    let extraContext = '';
    if (isReply.value && bookId) {
      const data = await loadChatData<LettersScopeData>('current', 'letters');
      const book = data?.books.find((b) => b.id === bookId);
      if (book) {
        const recent = book.entries.slice(-replyCountN.value);
        extraContext = recent
          .map((e, i) => `第${i + 1}封 (${e.sender.name}→${e.receiver.name}, ${e.format}): ${e.title}\n${e.content.slice(0, 200)}${e.content.length > 200 ? '...' : ''}`)
          .join('\n\n---\n\n');
      }
    }

    const config: Record<string, unknown> = {
      sender: { name: senderName.value.trim() },
      receiver: { name: receiverName.value.trim() },
      format: letterFormat.value,
      extraContext,
      generationConfig: {
        sourceMode: sourceMode.value,
        sourceRanges: sourceMode.value === 'recent' ? [{ start: 0, end: recentN.value }] : [],
        resultMode: resultMode.value,
        stream: stream.value,
      },
    };

    if (isReply.value) {
      config.replyCountN = replyCountN.value;
    }

    const result = await generateContent(adapter, config as any);
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

onMounted(() => prefillFromBook());
</script>
