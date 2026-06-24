import '@/global.css';
import { ensurePhone, registerMenuEntry, showPhone } from '@/core/phone-lifecycle';

let ready = false;

async function initPlugin(): Promise<void> {
  if (ready) return;

  // 等待 TavernHelper 就绪
  if (!window.TavernHelper) {
    // 轮询等待
    await new Promise<void>((resolve) => {
      const check = () => {
        if (window.TavernHelper) {
          resolve();
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  try {
    await ensurePhone();
    registerMenuEntry();
    ready = true;
  } catch (err) {
    console.error('[酒馆手机] 初始化失败:', err);
    toastr?.error('酒馆手机插件初始化失败，请检查控制台');
  }
}

// 在 APP_READY 之后初始化
$(async () => {
  // 等待 SillyTavern 的 APP_READY 事件
  if (typeof eventSource !== 'undefined') {
    eventSource.once('APP_READY', () => {
      initPlugin();
    });
  } else {
    // 如果 eventSource 不可用，等待 TavernHelper 后初始化
    initPlugin();
  }
});

// 暴露 API 给外部
(window as Record<string, unknown>).showTavernPhone = showPhone;
