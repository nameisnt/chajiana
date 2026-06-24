import type { GenerationAdapter, GenerationRequestParts, ParseResult, GenerationSaveContext, CharacterRef, RenderMode } from '@/types';
import { z } from 'zod/v4';
import { parseGenerationResult } from '@/generation/xml-parser';
import { XML_FORMAT_BASIC } from '@/constants/xml-formats';
import { DEFAULT_APP_PROMPTS, DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';

interface TheaterConfig {
  typeId: string;
  typeName: string;
  participants: CharacterRef[];
  renderMode: RenderMode;
  extraRequirement?: string;
}

const TheaterConfigSchema = z.object({
  typeId: z.string(),
  typeName: z.string(),
  participants: z.array(z.object({ id: z.string().optional(), name: z.string() })),
  renderMode: z.enum(['markdown', 'frontend']),
  extraRequirement: z.string().optional(),
  generationConfig: z.object({}).passthrough(),
  textProvider: z.object({}).passthrough().optional(),
});

/**
 * 从生成结果中提取 HTML 内容（用于 frontend 模式）
 * 保留 <content> 标签中的原始 HTML，不做转义
 */
function extractHtml(raw: string): { title: string; content: string } | null {
  const resultBlockMatch = raw.match(/<result>([\s\S]*?)<\/result>/i);
  if (!resultBlockMatch) return null;

  const resultBlock = resultBlockMatch[1];
  const titleMatch = resultBlock.match(/<title>([\s\S]*?)<\/title>/i);
  const contentMatch = resultBlock.match(/<content>([\s\S]*?)<\/content>/i);

  if (!titleMatch || !contentMatch) return null;

  return {
    title: titleMatch[1].trim(),
    content: contentMatch[1].trim(),
  };
}

/**
 * 获取指定类型的 prompt
 */
function getTypePrompt(typeName: string): string {
  const builtin = DEFAULT_TYPE_PROMPTS.theater.find((t) => t.name === typeName);
  return builtin?.prompt ?? '';
}

export function createTheaterAdapter(): GenerationAdapter<TheaterConfig, { title: string; content: string }> {
  return {
    appId: 'theater',
    actionId: 'newTheater',

    configSchema: TheaterConfigSchema,

    buildRequest(config: TheaterConfig): GenerationRequestParts {
      const participantsStr = config.participants.map((p) => p.name).join('、');
      const typePrompt = getTypePrompt(config.typeName);
      const renderModeHint = config.renderMode === 'frontend'
        ? '\n请使用HTML格式输出内容，包含完整的HTML标签结构以便直接渲染。'
        : '';

      return {
        extraContext: `小剧场类型：${config.typeName}\n参与角色：${participantsStr}\n渲染模式：${config.renderMode}${renderModeHint}`,
        appPrompt: DEFAULT_APP_PROMPTS.theater,
        typePrompt: typePrompt || undefined,
        userRequirement: config.extraRequirement,
        outputFormat: XML_FORMAT_BASIC,
      };
    },

    parse(raw: string, config: TheaterConfig): ParseResult<{ title: string; content: string }> {
      const warnings: string[] = [];

      if (config.renderMode === 'frontend') {
        // 使用自定义提取器保留原始 HTML
        const extracted = extractHtml(raw);
        if (!extracted) {
          warnings.push('未找到完整的 <result><title>...</title><content>...</content></result> 结构');
          return { ok: false, raw, warnings };
        }
        return { ok: true, data: extracted, raw, warnings };
      }

      // markdown 模式使用标准解析器
      return parseGenerationResult<{ title: string; content: string }>(raw, 'theater', 'newTheater');
    },

    async save(result, context): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.TheaterScopeData>(context.scopeId, 'theater')) ?? {
        entries: [],
        failedDrafts: [],
      };

      const now = new Date().toISOString();
      const entityId = crypto.randomUUID();
      const config = context.source as unknown as TheaterConfig;

      const entry: type.TheaterEntry = {
        id: entityId,
        title: result.title,
        content: result.content,
        source: { ...(context.source as any), label: context.source.label },
        favorite: false,
        typeId: config.typeId,
        typeName: config.typeName,
        participants: config.participants,
        renderMode: config.renderMode,
        createdAt: now,
        updatedAt: now,
      };

      data.entries.push(entry);
      await saveChatData(context.scopeId, 'theater', data);

      return { entityId };
    },
  };
}
