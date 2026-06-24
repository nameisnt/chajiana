<template>
  <div class="pc-app-grid">
    <button
      v-for="appId in appIds"
      :key="appId"
      type="button"
      class="pc-app-icon-btn"
      @click="$emit('openApp', appId)"
    >
      <div class="pc-app-icon">
        <i :class="getAppIcon(appId)"></i>
      </div>
      <span class="pc-app-label">{{ getAppName(appId) }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { getApp } from '@/core/app-registry';

defineProps<{ appIds: string[] }>();
defineEmits<{ openApp: [appId: string] }>();

function getAppIcon(appId: string): string {
  return getApp(appId)?.icon ?? 'fa-solid fa-circle';
}

function getAppName(appId: string): string {
  return getApp(appId)?.name ?? appId;
}
</script>

<style scoped>
.pc-app-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px 8px;
  padding: 12px 16px;
}

@media (max-width: 768px) {
  .pc-app-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.pc-app-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 4px;
  color: inherit;
  transition: transform 0.15s;
}

.pc-app-icon-btn:active {
  transform: scale(0.92);
}

.pc-app-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(128, 128, 128, 0.12);
}

.pc-app-label {
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
