import { extension_settings } from '@sillytavern/scripts/extensions';

export function getSettings<T = unknown>(path: string, defaultValue?: T): T | undefined {
  if (!extension_settings) return defaultValue;
  return _.get(extension_settings, path) as T | undefined;
}

export function setSettings(path: string, value: unknown): void {
  if (!extension_settings) {
    console.warn('[酒馆手机] extension_settings 不可用，设置未保存:', path);
    return;
  }
  _.set(extension_settings, path, klona(value));
  saveSettingsDebounced();
}
