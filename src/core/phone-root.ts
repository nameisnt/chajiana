import App from '@/App.vue';
import type { App as VueApp } from 'vue';

let vueApp: VueApp | null = null;
let rootEl: HTMLElement | null = null;

export function createPhoneRoot(): HTMLElement {
  if (rootEl) return rootEl;

  rootEl = document.createElement('div');
  rootEl.id = 'phone-creative-root';
  rootEl.setAttribute('aria-label', '酒馆手机创作助手');
  document.body.appendChild(rootEl);
  return rootEl;
}

export function mountPhoneApp(): VueApp {
  if (vueApp) return vueApp;

  const root = createPhoneRoot();
  vueApp = createApp(App);
  const pinia = createPinia();
  vueApp.use(pinia);
  vueApp.mount(root);
  return vueApp;
}

export function getPhoneRoot(): HTMLElement | null {
  return rootEl;
}

export function getVueApp(): VueApp | null {
  return vueApp;
}

export function unmountPhoneApp(): void {
  if (vueApp) {
    vueApp.unmount();
    vueApp = null;
  }
  if (rootEl) {
    rootEl.remove();
    rootEl = null;
  }
}

export function showPhoneRoot(): void {
  if (rootEl) {
    rootEl.removeAttribute('hidden');
  }
}

export function hidePhoneRoot(): void {
  if (rootEl) {
    rootEl.setAttribute('hidden', '');
  }
}

export function setThemeAttribute(theme: 'light' | 'dark'): void {
  const phoneRoot = rootEl?.querySelector<HTMLElement>('.phone-root');
  if (phoneRoot) {
    phoneRoot.setAttribute('data-theme', theme);
  }
}
