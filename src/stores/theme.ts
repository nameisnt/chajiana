export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark'>(
    (_.get(extension_settings, 'sillytavernPhone.theme') as 'light' | 'dark') ?? 'light',
  );

  function setTheme(t: 'light' | 'dark') {
    theme.value = t;
    _.set(extension_settings, 'sillytavernPhone.theme', t);
    saveSettingsDebounced();
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
