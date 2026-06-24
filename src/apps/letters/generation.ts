import type { GenerationAdapter, GenerationRequestParts, ParseResult, GenerationSaveContext, CharacterRef, LetterFormat } from '@/types';
import { z } from 'zod/v4';
import { parseGenerationResult } from '@/generation/xml-parser';
import { XML_FORMAT_LETTER } from '@/constants/xml-formats';
import { DEFAULT_APP_PROMPTS } from '@/constants/default-prompts';

interface LettersConfig {
  sender: CharacterRef;
  receiver: CharacterRef;
  format: LetterFormat;
  extraContext?: string;
  extraRequirement?: string;
}

const LettersConfigSchema = z.object({
  sender: z.object({ id: z.string().optional(), name: z.string() }),
  receiver: z.object({ id: z.string().optional(), name: z.string() }),
  format: z.enum(['formal', 'note', 'sms', 'email']),
  extraContext: z.string().optional(),
  extraRequirement: z.string().optional(),
  generationConfig: z.object({}).passthrough(),
  textProvider: z.object({}).passthrough().optional(),
});

function makeParticipantKey(a: CharacterRef, b: CharacterRef): string {
  const names = [a.name, b.name].sort();
  return names.join(' ↔ ');
}

function formatLabel(format: LetterFormat): string {
  const map: Record<LetterFormat, string> = { formal: '正式信函', note: '便条', sms: '短信', email: '邮件' };
  return map[format];
}

function buildBaseContext(config: LettersConfig): string {
  return `发信人：${config.sender.name}\n收信人：${config.receiver.name}\n信件格式：${formatLabel(config.format)}`;
}

export function createNewLetterAdapter(): GenerationAdapter<LettersConfig, { title: string; content: string }> {
  return {
    appId: 'letters',
    actionId: 'newLetter',

    configSchema: LettersConfigSchema,

    buildRequest(config: LettersConfig): GenerationRequestParts {
      return {
        extraContext: buildBaseContext(config) + (config.extraContext ? `\n${config.extraContext}` : ''),
        appPrompt: DEFAULT_APP_PROMPTS.letters,
        userRequirement: config.extraRequirement,
        outputFormat: XML_FORMAT_LETTER,
      };
    },

    parse(raw: string, _config: LettersConfig): ParseResult<{ title: string; content: string }> {
      return parseGenerationResult<{ title: string; content: string }>(raw, 'letters', 'newLetter');
    },

    async save(result, context): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.LettersScopeData>(context.scopeId, 'letters')) ?? {
        books: [],
        failedDrafts: [],
      };

      const now = new Date().toISOString();
      const entityId = crypto.randomUUID();
      const config = context.source as unknown as LettersConfig;
      const key = makeParticipantKey(config.sender, config.receiver);

      let book = data.books.find((b) => b.participantKey === key);
      if (!book) {
        book = {
          id: crypto.randomUUID(),
          participantKey: key,
          participants: [config.sender, config.receiver],
          title: `${config.sender.name}与${config.receiver.name}的书信`,
          entries: [],
          createdAt: now,
          updatedAt: now,
        };
        data.books.push(book);
      }

      const entry: type.LetterEntry = {
        id: entityId,
        title: result.title,
        content: result.content,
        source: { ...(context.source as any), label: context.source.label },
        favorite: false,
        sender: config.sender,
        receiver: config.receiver,
        format: config.format,
        createdAt: now,
        updatedAt: now,
      };

      book.entries.push(entry);
      book.updatedAt = now;
      await saveChatData(context.scopeId, 'letters', data);

      return { entityId };
    },
  };
}

export function createReplyLetterAdapter(): GenerationAdapter<LettersConfig & { replyCountN: number }, { title: string; content: string }> {
  return {
    appId: 'letters',
    actionId: 'replyLetter',

    configSchema: LettersConfigSchema.extend({
      replyCountN: z.number().int().min(1).max(20).default(5),
    }),

    buildRequest(config: LettersConfig & { replyCountN: number }): GenerationRequestParts {
      let contextStr = buildBaseContext(config);
      if (config.extraContext) {
        contextStr += `\n最近的往来信件：\n${config.extraContext}`;
      }
      return {
        extraContext: contextStr,
        appPrompt: `请根据以下往来信件，以${config.sender.name}的身份写一封回信给${config.receiver.name}。回信应当延续对话的语气和内容。`,
        userRequirement: config.extraRequirement,
        outputFormat: XML_FORMAT_LETTER,
      };
    },

    parse(raw: string, _config: LettersConfig & { replyCountN: number }): ParseResult<{ title: string; content: string }> {
      return parseGenerationResult<{ title: string; content: string }>(raw, 'letters', 'replyLetter');
    },

    async save(result, context): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.LettersScopeData>(context.scopeId, 'letters')) ?? {
        books: [],
        failedDrafts: [],
      };

      const now = new Date().toISOString();
      const entityId = crypto.randomUUID();
      const config = context.source as unknown as LettersConfig;
      const key = makeParticipantKey(config.sender, config.receiver);

      let book = data.books.find((b) => b.participantKey === key);
      if (!book) {
        book = {
          id: crypto.randomUUID(),
          participantKey: key,
          participants: [config.sender, config.receiver],
          title: `${config.sender.name}与${config.receiver.name}的书信`,
          entries: [],
          createdAt: now,
          updatedAt: now,
        };
        data.books.push(book);
      }

      const entry: type.LetterEntry = {
        id: entityId,
        title: result.title,
        content: result.content,
        source: { ...(context.source as any), label: context.source.label },
        favorite: false,
        sender: config.sender,
        receiver: config.receiver,
        format: config.format,
        createdAt: now,
        updatedAt: now,
      };

      book.entries.push(entry);
      book.updatedAt = now;
      await saveChatData(context.scopeId, 'letters', data);

      return { entityId };
    },
  };
}
