<template>
  <div class="pc-frontend-frame" ref="containerRef">
    <iframe
      v-if="htmlContent"
      ref="iframeRef"
      class="pc-frontend-iframe"
      :srcdoc="builtDoc"
      sandbox="allow-scripts"
      :style="{ height: iframeHeight + 'px' }"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  htmlContent: string;
  renderMode: 'markdown' | 'frontend';
}>();

const containerRef = ref<HTMLElement | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const iframeHeight = ref(420);

const CSP =
  "default-src 'none'; img-src https: data: blob:; media-src https: data: blob:; font-src https: data:; style-src 'unsafe-inline' https:; script-src 'unsafe-inline' https:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

function buildFrontendDocument(html: string): string {
  let content = html;

  // 移除危险标签
  content = content.replace(/<base\b[^>]*>/gi, '');
  content = content.replace(/<meta\b[^>]*http-equiv\s*=\s*["']refresh[^>]*>/gi, '');
  content = content.replace(/<(iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '');
  content = content.replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '');

  // 检测是否已经是完整 HTML
  const hasDocType = /<!doctype/i.test(content);
  const hasHtmlTag = /<html[\s>]/i.test(content);

  if (hasDocType && hasHtmlTag) {
    return content.replace(
      /<head>/i,
      `<head><meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    );
  }

  // 补齐为完整文档
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 12px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

const builtDoc = computed(() => {
  if (props.renderMode !== 'frontend') return '';
  return buildFrontendDocument(props.htmlContent);
});

function handleMessage(event: MessageEvent) {
  if (!iframeRef.value) return;
  if (event.source !== iframeRef.value.contentWindow) return;
  if (event.data?.type === 'setHeight' && typeof event.data.height === 'number') {
    iframeHeight.value = Math.max(200, Math.min(event.data.height, 2000));
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

<style scoped>
.pc-frontend-frame {
  width: 100%;
  overflow: hidden;
}
.pc-frontend-iframe {
  width: 100%;
  border: none;
}
</style>
