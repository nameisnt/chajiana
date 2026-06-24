import type { GenerationAdapter, GenerationRequestParts, ParseResult, GenerationSaveContext } from '@/types';
import { z } from 'zod/v4';
import { parseGenerationResult, resolveForumTempRefs } from '@/generation/xml-parser';
import { APP_XML_FORMATS } from '@/constants/xml-formats';
import { DEFAULT_APP_PROMPTS } from '@/constants/default-prompts';

interface ForumConfig {
  boardId: string;
  boardName?: string;
  author?: string;
  mode: 'newThread' | 'continueReply';
  threadId?: string;
  extraRequirement?: string;
  extraContext?: string;
}

interface ForumParseData {
  board?: string;
  title?: string;
  author?: string;
  content?: string;
  replies: Array<{ author: string; content: string; parentRef: string }>;
}

const ForumConfigSchema = z.object({
  boardId: z.string(),
  boardName: z.string().optional(),
  author: z.string().optional(),
  mode: z.enum(['newThread', 'continueReply']),
  threadId: z.string().optional(),
  extraRequirement: z.string().optional(),
  extraContext: z.string().optional(),
  generationConfig: z.object({}).passthrough(),
  textProvider: z.object({}).passthrough().optional(),
});

export function createForumAdapter(
  actionId: 'newThread' | 'continueReply',
): GenerationAdapter<ForumConfig, ForumParseData> {
  return {
    appId: 'forum',
    actionId,

    configSchema: ForumConfigSchema,

    buildRequest(config: ForumConfig): GenerationRequestParts {
      const outputFormat = APP_XML_FORMATS.forum(actionId);

      let extraContext = config.extraContext ?? '';

      if (actionId === 'continueReply' && config.threadId) {
        extraContext = (extraContext ? extraContext + '\n' : '')
          + '这是续回模式，请根据现有帖子和回复生成新的回复。';
      }

      return {
        extraContext: extraContext || undefined,
        appPrompt: DEFAULT_APP_PROMPTS.forum,
        userRequirement: config.extraRequirement
          ?? (actionId === 'continueReply' ? '请继续生成新的回复' : '请生成一个新的论坛帖子'),
        outputFormat,
      };
    },

    parse(raw: string, _config: ForumConfig): ParseResult<ForumParseData> {
      return parseGenerationResult<ForumParseData>(raw, 'forum', actionId);
    },

    async save(
      result: ForumParseData,
      context: GenerationSaveContext,
    ): Promise<{ entityId: string }> {
      const { loadChatData, saveChatData } = await import('@/repositories/data-repository');
      const type = await import('@/types/data.creative');

      const data = (await loadChatData<type.ForumScopeData>(context.scopeId, 'forum')) ?? {
        boards: [],
        failedDrafts: [],
      };

      const config = context.source as unknown as ForumConfig;
      const now = new Date().toISOString();

      if (actionId === 'newThread') {
        // Create a new thread in the board
        const boardName = result.board ?? config.boardName ?? '综合讨论';

        // Find or create board
        let board = data.boards.find(
          (b) => b.id === config.boardId || b.name === boardName,
        );

        if (!board) {
          board = {
            id: config.boardId || crypto.randomUUID(),
            name: boardName,
            threads: [],
            createdAt: now,
            updatedAt: now,
          };
          data.boards.push(board);
        } else {
          board.name = boardName;
        }

        const threadId = crypto.randomUUID();
        const replies = result.replies.map((r) => ({
          id: crypto.randomUUID(),
          author: r.author,
          content: r.content,
          parentReplyId: r.parentRef || undefined,
          source: context.source,
          createdAt: now,
          updatedAt: now,
        }));

        const thread: type.ForumThread = {
          id: threadId,
          title: result.title ?? '无标题',
          content: result.content ?? '',
          source: context.source,
          favorite: false,
          boardId: board.id,
          author: result.author ?? config.author ?? '匿名',
          replies,
          createdAt: now,
          updatedAt: now,
        };

        board.threads.push(thread);
        board.updatedAt = now;

        await saveChatData(context.scopeId, 'forum', data);
        return { entityId: threadId };
      } else {
        // continueReply - add replies to existing thread
        const threadId = config.threadId;
        if (!threadId) {
          throw new Error('continueReply requires threadId');
        }

        let targetThread: type.ForumThread | null = null;
        for (const board of data.boards) {
          const found = board.threads.find((t) => t.id === threadId);
          if (found) {
            targetThread = found;
            break;
          }
        }

        if (!targetThread) {
          throw new Error(`Thread not found: ${threadId}`);
        }

        // Resolve temp refs (E1, E2, N1, N2) to real reply IDs
        const newReplies = result.replies.map((r) => ({
          id: crypto.randomUUID(),
          author: r.author || config.author || '匿名',
          content: r.content,
          parentRef: r.parentRef || '',
        }));

        const { resolved, warnings } = resolveForumTempRefs(newReplies, targetThread.replies);

        for (const reply of resolved) {
          targetThread.replies.push({
            id: reply.id,
            author: reply.author,
            content: reply.content,
            parentReplyId: reply.parentRef || undefined,
            source: context.source,
            createdAt: now,
            updatedAt: now,
          });
        }

        targetThread.updatedAt = now;
        for (const board of data.boards) {
          board.updatedAt = now;
        }

        await saveChatData(context.scopeId, 'forum', data);
        return { entityId: threadId };
      }
    },
  };
}
