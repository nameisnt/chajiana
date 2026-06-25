<template>
  <PhoneFrame>
    <TopBar />
    <div class="pc-content-area" style="background:#fff;color:#000;padding:16px;font-size:16px;overflow-y:auto">
      <div style="background:#00ff00;padding:12px;margin-bottom:8px;border:3px solid #000;font-weight:bold">
        TEST: HomeScreen below, {{ navStore.stack.length === 0 ? 'home' : 'app' }}
      </div>
      <KeepAlive>
        <HomeScreen
          v-if="navStore.stack.length === 0"
          @open-app="onOpenApp"
        />
        <component
          v-else
          :is="currentAppComponent"
          v-if="currentAppComponent"
          :key="navStore.currentNav?.appId"
        />
      </KeepAlive>
    </div>
    <div v-if="!navStore.isOpen" class="pc-hidden-overlay" />
  </PhoneFrame>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { useThemeStore } from '@/stores/theme';
import { getCachedModule, loadAppModule } from '@/core/app-registry';
import type { Component } from 'vue';
import PhoneFrame from '@/components/PhoneFrame.vue';
import TopBar from '@/components/TopBar.vue';
import HomeScreen from '@/components/HomeScreen.vue';

const navStore = useNavigationStore();
const themeStore = useThemeStore();
const currentAppComponent = ref<Component | null>(null);
const loadedAppId = ref<string | null>(null);

async function onOpenApp(appId: string) {
  if (loadedAppId.value === appId && currentAppComponent.value) return;

  const mod = getCachedModule(appId) ?? (await loadAppModule(appId));
  if (!mod || mod.routes.length === 0) return;

  currentAppComponent.value = mod.routes[0].component;
  loadedAppId.value = appId;
}

onMounted(() => {
  themeStore.applyTheme();
});
</script>

<style scoped>
.pc-content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pc-hidden-overlay {
  display: none;
}
</style>
