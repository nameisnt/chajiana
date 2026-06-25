<template>
  <div class="phone-root" :data-theme="theme">
    <div class="phone-shell" style="background:#f2f2f7">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();
const theme = computed(() => themeStore.theme);
</script>

<style scoped>
.phone-shell {
  width: 360px;
  height: 700px;
  border-radius: 44px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  position: relative;
}

@media (max-width: 768px) {
  .phone-shell {
    width: 92vw;
    max-width: 360px;
    height: 85vh;
    max-height: 700px;
    border-radius: 28px;
  }
}
</style>
