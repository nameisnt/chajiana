import { extension_settings } from '@sillytavern/scripts/extensions';
import { createFloatBall, destroyFloatBall, hideFloatBall, showFloatBall, setupFloatBallResizeHandler } from './float-ball';
import { createPhoneRoot, getPhoneRoot, mountPhoneApp, showPhoneRoot, hidePhoneRoot, unmountPhoneApp } from './phone-root';
import { registerBuiltinApps, disposeAllApps } from './app-registry';
import { useNavigationStore } from '@/stores/navigation';
import { useThemeStore } from '@/stores/theme';

let initialized = false;
const disposers: Array<() => void> = [];

const PLUGIN_STATE_KEY = '__sillytavernPhonePluginState__' as const;

interface PluginState {
  initialized: boolean;
}

function getPluginState(): PluginState {
  if (!(window as Record<string, unknown>)[PLUGIN_STATE_KEY]) {
    (window as Record<string, unknown>)[PLUGIN_STATE_KEY] = { initialized: false };
  }
  return (window as Record<string, unknown>)[PLUGIN_STATE_KEY] as PluginState;
}

export async function ensurePhone(): Promise<void> {
  const state = getPluginState();
  if (state.initialized) return;

  createPhoneRoot();
  registerBuiltinApps();
  mountPhoneApp();

  const floatSettings = _.get(
    extension_settings || {},
    'sillytavernPhone.floatBall',
  );
  if (floatSettings?.floatBallEnabled !== false) {
    createFloatBall();
    setupFloatBallResizeHandler();
  }

  // 监听聊天切换事件
  if (typeof eventSource !== 'undefined') {
    const onChatChanged = () => {
      // scope binding resolution will be handled later
    };
    eventSource.on('CHAT_CHANGED', onChatChanged);
    disposers.push(() => eventSource.removeListener('CHAT_CHANGED', onChatChanged));
  }

  state.initialized = true;
}

export function showPhone(): void {
  ensurePhone().then(() => {
    showPhoneRoot();
    hideFloatBall();

    const pinia = getActivePinia();
    if (pinia) {
      const nav = useNavigationStore(pinia);
      nav.show();

      const theme = useThemeStore(pinia);
      theme.applyTheme();
    }
  });
}

export function hidePhone(): void {
  hidePhoneRoot();
  showFloatBall();

  const pinia = getActivePinia();
  if (pinia) {
    const nav = useNavigationStore(pinia);
    nav.hide();
  }
}

export async function destroyPhone(): Promise<void> {
  // 停止活跃生成任务（由 generation service 处理）
  disposeAllApps();
  destroyFloatBall();
  unmountPhoneApp();

  disposers.forEach((fn) => fn());
  disposers.length = 0;

  const state = getPluginState();
  state.initialized = false;
}

export function isPhoneVisible(): boolean {
  const root = getPhoneRoot();
  return root !== null && !root.hasAttribute('hidden');
}

export function registerMenuEntry(): void {
  // 在酒馆扩展菜单中注册"打开酒馆手机"入口
  // 使用 SillyTavern 的扩展菜单 API
  if (typeof $('#extensionsMenu').length !== 'undefined') {
    const menuItem = $(`
      <div id="phone-creative-menu-item" class="list-group-item flex-container flexGap5">
        <span class="menu_button menu_button_default">
          <i class="fa-solid fa-mobile-screen-button"></i>
          <span>${t`打开酒馆手机`}</span>
        </span>
      </div>
    `);
    menuItem.on('click', () => {
      if (isPhoneVisible()) {
        hidePhone();
      } else {
        showPhone();
      }
    });
    $('#extensionsMenu').append(menuItem);
  }
}
