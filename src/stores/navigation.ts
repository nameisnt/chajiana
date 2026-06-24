import type { NavState } from '@/types';

export const useNavigationStore = defineStore('navigation', () => {
  const stack = ref<NavState[]>([]);
  const isOpen = ref(false);

  const currentNav = computed<NavState | null>(() => {
    return stack.value.length > 0 ? stack.value[stack.value.length - 1] : null;
  });

  const title = computed(() => {
    if (stack.value.length === 0) return '酒馆手机';
    return currentNav.value?.title ?? '';
  });

  const canGoBack = computed(() => stack.value.length > 1);

  function openApp(appId: string, appName: string, page?: string, params?: Record<string, string>) {
    stack.value.push({
      appId,
      page: page ?? '',
      title: appName,
      params,
      origin: 'home',
    });
  }

  function push(page: string, title: string, params?: Record<string, string>) {
    if (!currentNav.value) return;
    stack.value.push({
      appId: currentNav.value.appId,
      page,
      title,
      params,
      origin: currentNav.value.origin,
    });
  }

  function replace(page: string, title: string, params?: Record<string, string>) {
    if (!currentNav.value) return;
    stack.value[stack.value.length - 1] = {
      appId: currentNav.value.appId,
      page,
      title,
      params,
      origin: currentNav.value.origin,
    };
  }

  function back() {
    if (stack.value.length <= 1) {
      isOpen.value = false;
      stack.value = [];
      return;
    }
    stack.value.pop();
  }

  function home() {
    stack.value = [];
  }

  function show() {
    isOpen.value = true;
  }

  function hide() {
    isOpen.value = false;
  }

  return {
    stack,
    isOpen,
    currentNav,
    title,
    canGoBack,
    openApp,
    push,
    replace,
    back,
    home,
    show,
    hide,
  };
});
