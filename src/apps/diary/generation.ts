import type { GenerationAdapter, GenerationRequestParts, ParseResult, GenerationSaveContext } from '@/types';
import { z } from 'zod/v4';
import { parseGenerationResult } from '@/generation/xml-parser';
import { XML_FORMAT_BASIC } from '@/constants/xml-formats';
import { DEFAULT_APP_PROMPTS, DEFAULT_SPECIAL_PROMPTS } from '@/constants/default-prompts';

interface DiaryConfig {
  perspective: { id?: string; name: string };
  kind: 'normal' | 'read-reaction';
  readers?: Array<{ id?: string; name: string }>;
  extraContext?: string;
  extraRequirement?: string;
}

const DiaryConfigSchema = z.object({
  perspective: z.object({ id: z.string().optional(), name: z.string() }),
  kind: z.enum(['normal', 'read-reaction']),
  readers: z.array(z.object({ id: z.string().optional(), name: z.string() })).optional(),
  extraContext: z.string().optional(),
  extraRequirement: z.string().optional(),
  generationConfig: z.object({}).passthrough(),
  textProvider: z.object({}).passthrough().optional(),
});

export function createDiaryAdapter(
  actionId: 'normal' | 'readReaction',
): GenerationAdapter<DiaryConfig, { title: string; content: string }> {
  return {
    appId: 'diary',
    actionId,

    configSchema: DiaryConfigSchema,

    buildRequest(config: DiaryConfig): GenerationRequestParts {
      const basePrompt = actionId === 'readReaction'
        ? DEFAULT_SPECIAL_PROMPTS.diaryReaction.replace('{{reader}}', config.readers?.map(r => r.name).join('、') ?? '')
        : DEFAULT_APP_PROMPTS.diary.replace('{{char}}', config.perspective.name);

      return {
        extraContext: config.extraContext,
        appPrompt: basePrompt,
        userRequirement: config.extraRequirement,
        outputFormat: XML_FORMAT_BASIC,
      };
    },

    parse(raw: string, _config: DiaryConfig): ParseResult<{ title: string; content: string }> {
      return parseGenerationResult<{ title: string; content: string }>(raw, 'diary', actionId);
    },

    async save(result, context): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.DiaryScopeData>(context.scopeId, 'diary')) ?? {
        books: [],
        failedDrafts: [],
      };

      const now = new Date().toISOString();
      const entityId = crypto.randomUUID();
      const config = context.source as unknown as DiaryConfig;

      // 按视角角色分册
      const perspKey = config.perspective.id ?? config.perspective.name;
      let book = data.books.find(
        (b) => (b.perspective.id ?? b.perspective.name) === perspKey,
      );

      if (!book) {
        book = {
          id: crypto.randomUUID(),
          perspective: config.perspective,
          title: `${config.perspective.name}的日记`,
          entries: [],
          createdAt: now,
          updatedAt: now,
        };
        data.books.push(book);
      }

      const entry: type.DiaryEntry = {
        id: entityId,
        title: result.title,
        content: result.content,
        source: { ...(context.source as any), label: context.source.label },
        favorite: false,
        perspective: config.perspective,
        occurredAt: now,
        kind: config.kind,
        readers: config.readers,
        createdAt: now,
        updatedAt: now,
      };

      book.entries.push(entry);
      book.updatedAt = now;
      await saveChatData(context.scopeId, 'diary', data);

      return { entityId };
    },
  };
}
