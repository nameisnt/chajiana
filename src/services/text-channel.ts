import type { TextProvider } from '@/types';

/**
 * 规范化外部 API URL
 * 去首尾空白、末尾 /、末尾 /models、末尾 /chat/completions
 */
export function normalizeExternalApiUrl(url: string): string {
  let normalized = url.trim();
  normalized = normalized.replace(/\/+$/, '');
  normalized = normalized.replace(/\/models\/?$/i, '');
  normalized = normalized.replace(/\/chat\/completions\/?$/i, '');
  return normalized;
}

/**
 * 校验外部 API URL 安全性
 */
export function validateApiUrl(url: string): { valid: true; normalized: string } | { valid: false; error: string } {
  const normalized = normalizeExternalApiUrl(url);

  if (!normalized) {
    return { valid: false, error: 'URL 不能为空' };
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: `不支持的协议: ${parsed.protocol}，仅支持 http/https` };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: 'URL 不能包含用户名或密码' };
    }
    return { valid: true, normalized };
  } catch {
    return { valid: false, error: '无效的 URL 格式' };
  }
}

/**
 * 测试外部 API 连接
 */
export async function testExternalApiConnection(
  apiUrl: string,
  apiKey?: string,
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  const urlValidation = validateApiUrl(apiUrl);
  if (!urlValidation.valid) {
    return { ok: false, error: urlValidation.error };
  }

  try {
    const models = await window.TavernHelper.getModelList({
      apiurl: urlValidation.normalized,
      key: apiKey,
    });
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '连接测试失败' };
  }
}

/**
 * 构建文本通道配置
 */
export function buildTextChannelConfig(provider: TextProvider): {
  custom_api?: {
    apiurl?: string;
    key?: string;
    model?: string;
    source?: string;
    max_tokens?: number;
  };
} {
  if (provider.mode === 'tavern') {
    return {};
  }

  const { apiUrl, apiKey, model, maxOutputTokens } = provider;
  return {
    custom_api: {
      apiurl: normalizeExternalApiUrl(apiUrl),
      key: apiKey,
      model,
      source: 'openai',
      max_tokens: maxOutputTokens,
    },
  };
}
