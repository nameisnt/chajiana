declare const hljs: typeof import('highlight.js').default;
declare const Popper: typeof import('@popperjs/core');

// SillyTavern globals
declare const extension_settings: Record<string, unknown>;
declare function saveSettingsDebounced(): void;
declare function saveChatDebounced(): void;

declare const eventSource: {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  once: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
};

declare const toastr: {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
};
