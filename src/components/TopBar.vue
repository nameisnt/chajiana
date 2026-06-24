<template>
  <header class="pc-topbar">
    <div class="pc-topbar-left">
      <button
        type="button"
        class="pc-topbar-btn"
        :title="navStore.canGoBack ? '返回' : '关闭'"
        @click="handleLeftClick"
      >
        <i v-if="navStore.canGoBack" class="fa-solid fa-chevron-left"></i>
        <i v-else class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="pc-topbar-center">
      <span class="pc-topbar-title">{{ navStore.title }}</span>
    </div>
    <div class="pc-topbar-right">
      <button
        v-if="navStore.stack.length > 0"
        type="button"
        class="pc-topbar-btn"
        title="主页"
        @click="navStore.home()"
      >
        <i class="fa-solid fa-house"></i>
      </button>
      <button type="button" class="pc-topbar-btn" title="切换主题" @click="themeStore.toggleTheme()">
        <i v-if="themeStore.theme === 'light'" class="fa-solid fa-moon"></i>
        <i v-else class="fa-solid fa-sun"></i>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation';
import { useThemeStore } from '@/stores/theme';
import { hidePhone } from '@/core/phone-lifecycle';

const navStore = useNavigationStore();
const themeStore = useThemeStore();

function handleLeftClick() {
  if (navStore.canGoBack) {
    navStore.back();
  } else {
    hidePhone();
  }
}
</script>

<style scoped>
.pc-topbar {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 8px;
  flex-shrink: 0;
  background: inherit;
}
.pc-topbar-left,
.pc-topbar-right {
  width: 72px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pc-topbar-right {
  justify-content: flex-end;
}
.pc-topbar-center {
  flex: 1;
  text-align: center;
  overflow: hidden;
}
.pc-topbar-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pc-topbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: inherit;
  transition: background 0.15s;
}
.pc-topbar-btn:hover {
  background: rgba(128, 128, 128, 0.15);
}
.pc-topbar-btn:active {
  background: rgba(128, 128, 128, 0.25);
}
</style>
