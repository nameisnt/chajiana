import { getSettings, setSettings } from '@/util/settings';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark'>(
    getSettings<'light' | 'dark'>('sillytavernPhone.theme') ?? 'light',
  );

  function setTheme(t: 'light' | 'dark') {
    theme.value = t;
    setSettings('sillytavernPhone.theme', t);
    applyTheme();
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light');
  }

  function applyTheme() {
    const root = document.getElementById('phone-creative-root');
    if (root) {
      const phoneRoot = root.querySelector<HTMLElement>('.phone-root');
      if (phoneRoot) {
        phoneRoot.setAttribute('data-theme', theme.value);
      }
    }
  }

  return { theme, setTheme, toggleTheme, applyTheme };
});
