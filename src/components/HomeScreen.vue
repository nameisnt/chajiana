<template>
  <div class="pc-home-screen">
    <div class="pc-home-content">
      <AppGrid :app-ids="visibleApps" @open-app="handleOpenApp" />
    </div>
    <Dock :dock-app-ids="layoutStore.layout.dockApps" @open-app="handleOpenApp" />
  </div>
</template>

<script setup lang="ts">
import { useHomeLayoutStore } from '@/stores/home-layout';
import { useNavigationStore } from '@/stores/navigation';
import { getApp } from '@/core/app-registry';
import AppGrid from './AppGrid.vue';
import Dock from './Dock.vue';

const emit = defineEmits<{ openApp: [appId: string] }>();

const layoutStore = useHomeLayoutStore();
const navStore = useNavigationStore();

const visibleApps = computed(() => layoutStore.getVisibleApps());

function handleOpenApp(appId: string) {
  const app = getApp(appId);
  if (!app) return;
  navStore.openApp(appId, app.name);
  emit('openApp', appId);
}
</script>

<style scoped>
.pc-home-screen {
  display: flex;
  flex-direction: column;
  flex: 1; min-height: 0;
}
.pc-home-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
}
</style>
