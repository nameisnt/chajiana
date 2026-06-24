import type { GenerationAdapter, GenerationRequestParts, ParseResult, GenerationSaveContext } from '@/types';
import { z } from 'zod/v4';
import { parseGenerationResult } from '@/generation/xml-parser';
import { XML_FORMAT_BASIC } from '@/constants/xml-formats';
import { DEFAULT_APP_PROMPTS, DEFAULT_TYPE_PROMPTS } from '@/constants/default-prompts';

interface ExtrasConfig {
  typeId: string;
  typeName: string;
  bookId?: string;
  outline?: string;
  sourceLabel: string;
  mode: 'newChapter' | 'continueChapter';
  extraRequirement?: string;
  extraContext?: string;
}

const ExtrasConfigSchema = z.object({
  typeId: z.string(),
  typeName: z.string(),
  bookId: z.string().optional(),
  outline: z.string().optional(),
  sourceLabel: z.string(),
  mode: z.enum(['newChapter', 'continueChapter']),
  extraRequirement: z.string().optional(),
  extraContext: z.string().optional(),
  generationConfig: z.object({}).passthrough(),
  textProvider: z.object({}).passthrough().optional(),
});

export function createExtrasAdapter(
  actionId: 'newChapter' | 'continueChapter',
): GenerationAdapter<ExtrasConfig, { title: string; content: string }> {
  return {
    appId: 'extras',
    actionId,

    configSchema: ExtrasConfigSchema,

    buildRequest(config: ExtrasConfig): GenerationRequestParts {
      const typePrompt = DEFAULT_TYPE_PROMPTS.extras.find(
        (t) => t.name === config.typeName,
      );

      let extraContext = config.extraContext ?? '';

      if (actionId === 'continueChapter') {
        extraContext = (extraContext ? extraContext + '\n' : '')
          + '这是续写模式，请接着之前的章节继续创作。';
        if (config.extraContext) {
          extraContext += '\n之前的章节摘要：\n' + config.extraContext;
        }
      }

      return {
        extraContext,
        appPrompt: DEFAULT_APP_PROMPTS.extras,
        typePrompt: typePrompt?.prompt,
        userRequirement: config.extraRequirement
          ?? (actionId === 'continueChapter' ? '请续写下一章' : '请创作新章节'),
        outputFormat: XML_FORMAT_BASIC,
      };
    },

    parse(raw: string, _config: ExtrasConfig): ParseResult<{ title: string; content: string }> {
      return parseGenerationResult<{ title: string; content: string }>(raw, 'extras', actionId);
    },

    async save(
      result: { title: string; content: string },
      context: GenerationSaveContext,
    ): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.ExtrasScopeData>(context.scopeId, 'extras')) ?? {
        books: [],
        failedDrafts: [],
      };

      const config = context.source as unknown as ExtrasConfig;
      const now = new Date().toISOString();
      const entityId = crypto.randomUUID();

      // Find or create ExtraBook by typeId
      let book: type.ExtraBook | undefined;

      if (config.bookId) {
        book = data.books.find((b) => b.id === config.bookId);
      }

      if (!book) {
        book = data.books.find((b) => b.typeId === config.typeId);
      }

      if (!book) {
        book = {
          id: crypto.randomUUID(),
          typeId: config.typeId,
          typeName: config.typeName,
          title: `${config.typeName}番外`,
          outline: config.outline,
          chapters: [],
          summaries: [],
          createdAt: now,
          updatedAt: now,
        };
        data.books.push(book);
      } else if (config.outline && !book.outline) {
        book.outline = config.outline;
      }

      const chapter: type.ExtraChapter = {
        id: entityId,
        title: result.title,
        content: result.content,
        source: context.source,
        favorite: false,
        chapterNumber: book.chapters.length + 1,
        createdAt: now,
        updatedAt: now,
      };

      book.chapters.push(chapter);
      book.updatedAt = now;
      await saveChatData(context.scopeId, 'extras', data);

      return { entityId };
    },
  };
}
