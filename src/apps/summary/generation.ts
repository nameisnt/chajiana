import type { GenerationAdapter, GenerationRequestParts, ParseResult, GenerationSaveContext, SourceSelection } from '@/types';
import { z } from 'zod/v4';
import { parseGenerationResult } from '@/generation/xml-parser';
import { XML_FORMAT_BASIC } from '@/constants/xml-formats';
import { DEFAULT_APP_PROMPTS } from '@/constants/default-prompts';

interface SummaryConfig {
  rangeLabel: string;
  source: SourceSelection;
  extraRequirement?: string;
}

const SummaryConfigSchema = z.object({
  rangeLabel: z.string(),
  source: z.object({}).passthrough() as z.ZodType<SourceSelection>,
  extraRequirement: z.string().optional(),
  generationConfig: z.object({}).passthrough(),
  textProvider: z.object({}).passthrough().optional(),
});

export function createSummaryAdapter(): GenerationAdapter<SummaryConfig, { title: string; content: string }> {
  return {
    appId: 'summary',
    actionId: 'normal',

    configSchema: SummaryConfigSchema,

    buildRequest(config: SummaryConfig): GenerationRequestParts {
      return {
        extraContext: `总结范围：${config.rangeLabel}`,
        appPrompt: DEFAULT_APP_PROMPTS.summaries,
        userRequirement: config.extraRequirement,
        outputFormat: XML_FORMAT_BASIC,
      };
    },

    parse(raw: string, _config: SummaryConfig): ParseResult<{ title: string; content: string }> {
      return parseGenerationResult<{ title: string; content: string }>(raw, 'summaries', 'normal');
    },

    async save(
      result: { title: string; content: string },
      context: GenerationSaveContext,
    ): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.SummariesScopeData>(context.scopeId, 'summaries')) ?? {
        books: [],
        failedDrafts: [],
      };

      const entityId = crypto.randomUUID();
      const now = new Date().toISOString();

      // 使用第一个或新建总结集
      let book = data.books[0];
      if (!book) {
        book = {
          id: crypto.randomUUID(),
          title: '默认总结集',
          entries: [],
          createdAt: now,
          updatedAt: now,
        };
        data.books.push(book);
      }

      const entry: type.SummaryEntry = {
        id: entityId,
        title: result.title,
        content: result.content,
        source: context.source,
        favorite: false,
        rangeLabel: (context.source as SourceSelection).label,
        createdAt: now,
        updatedAt: now,
      };

      book.entries.push(entry);
      book.updatedAt = now;
      await saveChatData(context.scopeId, 'summaries', data);

      return { entityId };
    },
  };
}
