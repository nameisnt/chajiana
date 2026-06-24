/**
 * SendGuard：生成事务期间拦截酒馆 UI 发送操作
 * 使用捕获阶段 + 命名空间事件，不调用全局 deactivateSendButtons/activateSendButtons
 */

let isActive = false;
let overlayEl: HTMLElement | null = null;
const eventCleanups: Array<() => void> = [];

const NAMESPACE = 'sillytavernPhone.sendGuard';

function createOverlay(): void {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.id = 'pc-send-guard-overlay';
  overlayEl.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483640;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
  `;

  const tip = document.createElement('div');
  tip.style.cssText = `
    background: #fff;
    color: #333;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    pointer-events: none;
  `;
  tip.textContent = '手机正在生成内容，请稍候...';
  overlayEl.appendChild(tip);

  document.body.appendChild(overlayEl);
}

function removeOverlay(): void {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

/**
 * 拦截发送操作（捕获阶段）
 */
function interceptSend(e: Event): void {
  if (!isActive) return;

  // 检查是否是酒馆的发送按钮或输入框 Enter
  const target = e.target as HTMLElement;
  const isSendBtn =
    target.matches('#send_but') ||
    target.matches('#send_but_scream') ||
    target.closest('#send_but') ||
    target.closest('#send_but_scream');

  // 检查回车键
  const isEnterInInput =
    e instanceof KeyboardEvent &&
    e.key === 'Enter' &&
    !e.shiftKey &&
    (target.matches('#send_textarea') || target.closest('#send_textarea'));

  if (isSendBtn || isEnterInInput) {
    e.stopPropagation();
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

/**
 * 激活 SendGuard
 */
export function activateSendGuard(): void {
  if (isActive) return;
  isActive = true;

  createOverlay();

  // 捕获阶段监听
  document.addEventListener('click', interceptSend, true);
  document.addEventListener('keydown', interceptSend, true);

  eventCleanups.push(() => {
    document.removeEventListener('click', interceptSend, true);
    document.removeEventListener('keydown', interceptSend, true);
  });
}

/**
 * 解除 SendGuard
 */
export function deactivateSendGuard(): void {
  isActive = false;
  removeOverlay();

  for (const cleanup of eventCleanups) {
    cleanup();
  }
  eventCleanups.length = 0;
}

/**
 * 检测外部生成（非本插件触发的生成）
 */
export function isExternalGeneration(ourGenerationId: string): boolean {
  // 检查是否有非本插件触发的生成正在进行
  // 通过检查 window 上的生成状态
  const extState = (window as Record<string, unknown>).__sillytavernPhonePluginState__ as
    | Record<string, unknown>
    | undefined;
  if (!extState) return false;
  return extState.activeGenerationId !== ourGenerationId && extState.isGenerating === true;
}
