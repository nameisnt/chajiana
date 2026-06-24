import type { GenerationAdapter, GenerationConfig, TextProvider } from '@/types';
import { resolveSourceSelection } from './source-selection';
import { beginVisibilityTransaction } from './visibility-transaction';
import { activateSendGuard, deactivateSendGuard } from './send-guard';
import { assembleUserInput, checkTokenBudget } from './prompt-assembly';
import { parseGenerationResult } from './xml-parser';
import { buildTextChannelConfig } from '@/services/text-channel';
import { createStreamHandler } from './stream-handler';

let isGenerating = false;
let activeGenerationId: string | null = null;

/**
 * 设置生成状态到全局标记
 */
function setGenerationState(generationId: string | null, generating: boolean) {
  const state = (window as Record<string, unknown>).__sillytavernPhonePluginState__ as Record<string, unknown> | undefined;
  if (state) {
    state.activeGenerationId = generationId;
    state.isGenerating = generating;
  }
  activeGenerationId = generationId;
  isGenerating = generating;
}

/**
 * 获取互斥锁
 */
function acquireLock(): boolean {
  if (isGenerating) return false;
  setGenerationState(null, true);
  return true;
}

/**
 * 释放互斥锁
 */
function releaseLock(): void {
  setGenerationState(null, false);
}

/**
 * 生成 UUID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 统一生成入口
 * 所有 App 通过此服务发起生成，不得直接调用 TavernHelper.generate()
 */
export async function generateContent<TConfig, TResult>(
  adapter: GenerationAdapter<TConfig, TResult>,
  config: TConfig & { generationConfig: GenerationConfig; textProvider?: TextProvider },
): Promise<{ success: true; entityId: string; raw: string; warnings: string[] } | { success: false; error: string; raw?: string; warnings: string[] }> {
  // 1. 校验
  const parseResult = adapter.configSchema.safeParse(config);
  if (!parseResult.success) {
    const msg = z.prettifyError(parseResult.error);
    return { success: false, error: `配置校验失败: ${msg}`, warnings: [] };
  }
  const validConfig = parseResult.data;

  // 2. 获取互斥锁
  if (!acquireLock()) {
    return { success: false, error: '已有生成任务在进行中', warnings: [] };
  }

  const generationId = generateId();
  setGenerationState(generationId, true);

  // 3. 解析来源楼层
  const { generationConfig } = validConfig;
  const scopeId = 'current'; // TODO: get from scope binding service
  const source = resolveSourceSelection(
    scopeId,
    generationConfig.sourceMode,
    generationConfig.sourceRanges,
    [],
  );

  if (!source) {
    releaseLock();
    return { success: false, error: '来源楼层选择无效：没有可见的楼层', warnings: [] };
  }

  // 4. 构建请求
  const parts = adapter.buildRequest(validConfig);
  const assembledInput = assembleUserInput(parts);

  // 5. Token 预检
  const allMessages = (window.TavernHelper as any).getChatMessages(
    `0-${(window.TavernHelper as any).getLastMessageId()}`,
    { hide_state: 'unhidden' },
  );
  const tokenCheck = checkTokenBudget(allMessages, assembledInput);
  if (!tokenCheck.ok) {
    releaseLock();
    return {
      success: false,
      error: `Token 超限：预估 ${tokenCheck.estimated} tokens，可用 ${tokenCheck.max} tokens。来源楼层: ${tokenCheck.sections.sourceMessages}, 输入: ${tokenCheck.sections.userInput}`,
      warnings: [],
    };
  }

  // 6. SendGuard 激活
  activateSendGuard();

  // 7. 来源隐藏事务
  const sourceIds = source.messageIds.length > 0
    ? source.messageIds
    : allMessages.map((m) => m.message_id);

  const transaction = await beginVisibilityTransaction(scopeId, generationId, sourceIds);

  try {
    // 8. 调用 generate()
    const textProvider: TextProvider = config.textProvider ?? { mode: 'tavern' };
    const channelConfig = buildTextChannelConfig(textProvider);

    let rawOutput: string;

    if (generationConfig.stream) {
      // 流式生成
      let streamedText = '';
      let streamDone = false;

      const streamHandler = createStreamHandler(
        generationId,
        (text) => { streamedText = text; },
        (text) => { streamedText = text; streamDone = true; },
        (text) => { streamedText = text; streamDone = true; },
      );

      const generatePromise = window.TavernHelper.generate({
        user_input: assembledInput,
        should_silence: true,
        should_stream: true,
        generation_id: generationId,
        ...channelConfig,
      });

      rawOutput = await generatePromise as string;

      if (!rawOutput && streamedText) {
        rawOutput = streamedText;
      }

      streamHandler.dispose();
    } else {
      rawOutput = await window.TavernHelper.generate({
        user_input: assembledInput,
        should_silence: true,
        should_stream: false,
        generation_id: generationId,
        ...channelConfig,
      }) as string;
    }

    // 9. 解析
    const parseResultObj = adapter.parse(rawOutput, validConfig);
    const warnings = [...parseResultObj.warnings];

    if (!parseResultObj.ok) {
      // 解析失败，生成 FailedDraft
      return {
        success: false,
        error: '解析失败',
        raw: rawOutput,
        warnings,
      };
    }

    // 10. 保存
    const saveResult = await adapter.save(parseResultObj.data, {
      scopeId,
      source,
      rawOutput,
    });

    return {
      success: true,
      entityId: saveResult.entityId,
      raw: rawOutput,
      warnings,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '生成失败',
      warnings: [],
    };
  } finally {
    // 恢复楼层 + 清除恢复日志
    await transaction.cleanup();

    // 解除 SendGuard
    deactivateSendGuard();

    // 释放互斥锁
    releaseLock();
  }
}

/**
 * 停止当前生成
 */
export function stopCurrentGeneration(): boolean {
  if (!isGenerating || !activeGenerationId) return false;
  return window.TavernHelper.stopGenerationById(activeGenerationId);
}

/**
 * 检查是否有活跃生成
 */
export function hasActiveGeneration(): boolean {
  return isGenerating;
}
