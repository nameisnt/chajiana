<template>
  <div class="pc-dock">
    <div class="pc-dock-inner">
      <button
        v-for="appId in dockAppIds"
        :key="appId"
        type="button"
        class="pc-dock-btn"
        style="width:48px;height:48px;border-radius:12px;background:rgba(0,0,0,0.08);color:#1c1c1e;border:none;font-size:22px;display:flex;align-items:center;justify-content:center;margin:0 4px"
        @click="$emit('openApp', appId)"
      >
        <i :class="getAppIcon(appId)" style="color:#1c1c1e"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApp } from '@/core/app-registry';

defineProps<{ dockAppIds: string[] }>();
defineEmits<{ openApp: [appId: string] }>();

function getAppIcon(appId: string): string {
  return getApp(appId)?.icon ?? 'fa-solid fa-circle';
}
</script>

<style scoped>
.pc-dock {
  padding: 8px 0 20px;
  flex-shrink: 0;
}
.pc-dock-inner {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 8px 20px;
  margin: 0 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
[data-theme='dark'] .pc-dock-inner {
  background: rgba(255, 255, 255, 0.06);
}
.pc-dock-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, background 0.15s;
}
.pc-dock-btn:active {
  transform: scale(0.88);
  background: rgba(128, 128, 128, 0.15);
}
</style>
