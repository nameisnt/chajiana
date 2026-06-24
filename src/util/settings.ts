/**
 * 安全获取 SillyTavern extension_settings
 * extension_settings 在插件加载早期可能尚未定义
 */
export function getSettings<T = unknown>(path: string, defaultValue?: T): T | undefined {
  if (typeof extension_settings === 'undefined') return defaultValue;
  return _.get(extension_settings, path) as T | undefined;
}

export function setSettings(path: string, value: unknown): void {
  if (typeof extension_settings === 'undefined') {
    console.warn('[酒馆手机] extension_settings 不可用，设置未保存:', path);
    return;
  }
  _.set(extension_settings, path, klona(value));
  saveSettingsDebounced();
}
