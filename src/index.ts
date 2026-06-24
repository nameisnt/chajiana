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

// jQuery ready 时直接初始化。loading_order 120 确保 TavernHelper 已就绪。
$(async () => {
  await initPlugin();
});

// 暴露 API 给外部
(window as Record<string, unknown>).showTavernPhone = showPhone;
