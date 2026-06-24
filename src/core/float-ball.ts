import type { FloatBallSettings } from '@/types';

const BALL_ROOT_CLASS = 'pc-float-ball-root';
const BALL_CLASS = 'pc-float-ball';

let ballRoot: HTMLElement | null = null;
let ballBtn: HTMLButtonElement | null = null;
let dragState: {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  isDragging: boolean;
} | null = null;

let cleanupFns: Array<() => void> = [];

function getSettings(): FloatBallSettings {
  return (_.get(extension_settings, 'sillytavernPhone.floatBall') as FloatBallSettings) ?? {
    floatBallEnabled: true,
    floatBallSize: 44,
    floatBallColor: '#007aff',
  };
}

function saveSettings(settings: FloatBallSettings): void {
  _.set(extension_settings, 'sillytavernPhone.floatBall', klona(settings));
  saveSettingsDebounced();
}

export function createFloatBall(): void {
  if (ballRoot) return;

  const settings = getSettings();
  if (!settings.floatBallEnabled) return;

  ballRoot = document.createElement('div');
  ballRoot.className = BALL_ROOT_CLASS;
  ballRoot.style.cssText = 'position:fixed;z-index:2147482000;pointer-events:none;';

  ballBtn = document.createElement('button');
  ballBtn.type = 'button';
  ballBtn.className = BALL_CLASS;
  ballBtn.title = '打开酒馆手机';
  ballBtn.setAttribute('aria-label', '打开酒馆手机');

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-mobile-screen-button';
  ballBtn.appendChild(icon);

  applyBallStyle(settings);
  setInitialPosition(settings);

  ballRoot.appendChild(ballBtn);
  document.body.appendChild(ballRoot);

  bindDrag(ballBtn, ballRoot, settings);
}

function applyBallStyle(settings: FloatBallSettings): void {
  if (!ballBtn) return;
  ballBtn.style.cssText = `
    position:absolute;
    width:${settings.floatBallSize}px;
    height:${settings.floatBallSize}px;
    border-radius:50%;
    background:${settings.floatBallColor};
    color:#fff;
    border:none;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:${settings.floatBallSize * 0.45}px;
    box-shadow:0 2px 12px rgba(0,0,0,0.2);
    pointer-events:auto;
    transition:transform 0.2s;
    -webkit-tap-highlight-color:transparent;
  `;
}

function setInitialPosition(settings: FloatBallSettings): void {
  if (!ballBtn) return;
  if (settings.floatBallX !== undefined && settings.floatBallY !== undefined) {
    ballBtn.style.left = `${settings.floatBallX}px`;
    ballBtn.style.top = `${settings.floatBallY}px`;
  } else {
    ballBtn.style.right = '20px';
    ballBtn.style.bottom = '100px';
  }
}

function clampPosition(left: number, top: number, size: number): { left: number; top: number } {
  const maxLeft = window.innerWidth - size;
  const maxTop = window.innerHeight - size;
  return {
    left: Math.max(0, Math.min(left, maxLeft)),
    top: Math.max(0, Math.min(top, maxTop)),
  };
}

function bindDrag(btn: HTMLButtonElement, root: HTMLElement, settings: FloatBallSettings): void {
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);

    const rect = btn.getBoundingClientRect();
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      isDragging: false,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const threshold = e.pointerType === 'touch' ? 15 : 5;

    if (!dragState.isDragging && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
      dragState.isDragging = true;
    }

    if (dragState.isDragging) {
      const size = settings.floatBallSize;
      const pos = clampPosition(dragState.startLeft + dx, dragState.startTop + dy, size);
      btn.style.left = `${pos.left}px`;
      btn.style.top = `${pos.top}px`;
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragState) return;
    btn.releasePointerCapture(e.pointerId);

    if (dragState.isDragging) {
      const size = settings.floatBallSize;
      const pos = clampPosition(
        Number.parseFloat(btn.style.left) || dragState.startLeft,
        Number.parseFloat(btn.style.top) || dragState.startTop,
        size,
      );
      btn.style.left = `${pos.left}px`;
      btn.style.top = `${pos.top}px`;

      const s = getSettings();
      s.floatBallX = pos.left;
      s.floatBallY = pos.top;
      saveSettings(s);
    }

    if (!dragState.isDragging) {
      import('@/core/phone-lifecycle').then((m) => m.showPhone());
    }

    dragState = null;
  };

  btn.addEventListener('pointerdown', onPointerDown);
  btn.addEventListener('pointermove', onPointerMove);
  btn.addEventListener('pointerup', onPointerUp);
  btn.addEventListener('pointercancel', onPointerUp);

  cleanupFns.push(() => {
    btn.removeEventListener('pointerdown', onPointerDown);
    btn.removeEventListener('pointermove', onPointerMove);
    btn.removeEventListener('pointerup', onPointerUp);
    btn.removeEventListener('pointercancel', onPointerUp);
  });
}

function reclampPosition(): void {
  if (!ballBtn) return;
  const settings = getSettings();
  const size = settings.floatBallSize;
  const left = Number.parseFloat(ballBtn.style.left);
  const top = Number.parseFloat(ballBtn.style.top);
  if (Number.isNaN(left) || Number.isNaN(top)) return;
  const pos = clampPosition(left, top, size);
  ballBtn.style.left = `${pos.left}px`;
  ballBtn.style.top = `${pos.top}px`;
}

export function updateFloatBallStyle(): void {
  if (!ballBtn) return;
  const settings = getSettings();
  applyBallStyle(settings);
}

export function showFloatBall(): void {
  if (!ballRoot) return;
  ballRoot.removeAttribute('hidden');
  ballRoot.style.display = '';
}

export function hideFloatBall(): void {
  if (!ballRoot) return;
  ballRoot.setAttribute('hidden', '');
  ballRoot.style.display = 'none';
}

export function destroyFloatBall(): void {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  if (ballRoot) {
    ballRoot.remove();
    ballRoot = null;
    ballBtn = null;
  }
  dragState = null;
}

export function setupFloatBallResizeHandler(): void {
  const handler = () => reclampPosition();
  window.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);
  cleanupFns.push(() => {
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
  });
}
