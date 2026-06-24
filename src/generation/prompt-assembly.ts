import type { GenerationRequestParts } from '@/types';

/**
 * 按模板拼接 user_input
 *
 * 拼接顺序：
 *   额外上下文 → 引用素材 → App 提示词 → 类型提示词 → 用户额外要求 → 固定输出格式
 */
export function assembleUserInput(parts: GenerationRequestParts): string {
  const sections: string[] = [];

  if (parts.extraContext) {
    sections.push(parts.extraContext);
  }

  if (parts.references) {
    sections.push(parts.references);
  }

  if (parts.appPrompt) {
    sections.push(parts.appPrompt);
  }

  if (parts.typePrompt) {
    sections.push(parts.typePrompt);
  }

  if (parts.userRequirement) {
    sections.push(parts.userRequirement);
  }

  if (parts.outputFormat) {
    sections.push(parts.outputFormat);
  }

  return sections.join('\n\n');
}

/**
 * 估算 token 数（简单估算：中文字符约 0.5 token，英文约 0.25 token）
 */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    if (/[一-鿿㐀-䶿]/.test(char)) {
      tokens += 0.5;
    } else {
      tokens += 0.25;
    }
  }
  return Math.ceil(tokens);
}

/**
 * Token 预检
 */
export function checkTokenBudget(
  sourceMessages: Array<{ message: string }>,
  assembledInput: string,
  maxTokens?: number,
): { ok: true } | { ok: false; estimated: number; max: number; sections: Record<string, number> } {
  const effectiveMax = maxTokens ?? 8192;
  const reservedRatio = 0.2;
  const availableTokens = Math.floor(effectiveMax * (1 - reservedRatio));

  const sourceText = sourceMessages.map((m) => m.message).join('\n');
  const sourceTokens = estimateTokens(sourceText);
  const inputTokens = estimateTokens(assembledInput);
  const total = sourceTokens + inputTokens;

  if (total > availableTokens) {
    return {
      ok: false,
      estimated: total,
      max: availableTokens,
      sections: {
        sourceMessages: sourceTokens,
        userInput: inputTokens,
      },
    };
  }

  return { ok: true };
}
