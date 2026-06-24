import type { HomeScreenLayout } from '@/types';
import { BUILTIN_APPS } from '@/constants/app-defaults';
import { getSettings, setSettings } from '@/util/settings';

const SETTINGS_KEY = 'sillytavernPhone.homeLayout';

function getDefaultLayout(): HomeScreenLayout {
  const apps = BUILTIN_APPS;
  return {
    appOrder: apps.slice().sort((a, b) => a.defaultOrder - b.defaultOrder).map((a) => a.id),
    hiddenApps: apps.filter((a) => !a.defaultVisible).map((a) => a.id),
    dockApps: apps.filter((a) => a.defaultDock).map((a) => a.id),
  };
}

export const useHomeLayoutStore = defineStore('homeLayout', () => {
  const layout = ref<HomeScreenLayout>(
    getSettings<HomeScreenLayout>(SETTINGS_KEY) ?? getDefaultLayout(),
  );

  function persist() {
    setSettings(SETTINGS_KEY, toRaw(layout.value));
  }

  function getVisibleApps() {
    return layout.value.appOrder.filter((id) => !layout.value.hiddenApps.includes(id));
  }

  function toggleAppVisibility(appId: string) {
    const idx = layout.value.hiddenApps.indexOf(appId);
    if (idx >= 0) {
      layout.value.hiddenApps.splice(idx, 1);
    } else {
      layout.value.hiddenApps.push(appId);
    }
    persist();
  }

  function toggleDock(appId: string) {
    const idx = layout.value.dockApps.indexOf(appId);
    if (idx >= 0) {
      layout.value.dockApps.splice(idx, 1);
    } else {
      if (layout.value.dockApps.length >= 4) {
        layout.value.dockApps.shift();
      }
      layout.value.dockApps.push(appId);
    }
    persist();
  }

  function reorderApps(newOrder: string[]) {
    layout.value.appOrder = newOrder;
    persist();
  }

  function resetLayout() {
    layout.value = getDefaultLayout();
    persist();
  }

  return { layout, getVisibleApps, toggleAppVisibility, toggleDock, reorderApps, resetLayout };
});
