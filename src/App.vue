<template>
  <PhoneFrame>
    <TopBar />
    <div class="pc-content-area" style="background:#f00;color:#fff;padding:20px;font-size:20px">
      DEBUG: Vue mounted. Stack: {{ navStore.stack.length }}, Apps: {{ visibleCount }}
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
import { useHomeLayoutStore } from '@/stores/home-layout';
import { getCachedModule, loadAppModule } from '@/core/app-registry';
import type { Component } from 'vue';
import PhoneFrame from '@/components/PhoneFrame.vue';
import TopBar from '@/components/TopBar.vue';
import HomeScreen from '@/components/HomeScreen.vue';

const navStore = useNavigationStore();
const themeStore = useThemeStore();
const layoutStore = useHomeLayoutStore();

const currentAppComponent = ref<Component | null>(null);
const loadedAppId = ref<string | null>(null);

const visibleCount = computed(() => layoutStore.getVisibleApps().length);

async function onOpenApp(appId: string) {
  if (loadedAppId.value === appId && currentAppComponent.value) return;

  const mod = getCachedModule(appId) ?? (await loadAppModule(appId));
  if (!mod || mod.routes.length === 0) return;

  currentAppComponent.value = mod.routes[0].component;
  loadedAppId.value = appId;
}

onMounted(() => {
  themeStore.applyTheme();
  console.log('[酒馆手机] App mounted, visible apps:', visibleCount.value);
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
