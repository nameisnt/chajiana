import { z } from 'zod/v4';

// ========== 基础 ==========

export const CharacterRefSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
});

export const SourceSelectionSchema = z.object({
  scopeId: z.string(),
  chatIdAtGeneration: z.string(),
  mode: z.enum(['latest', 'fromStart', 'all', 'single', 'recent', 'range']),
  ranges: z.array(z.object({ start: z.number(), end: z.number() })),
  messageIds: z.array(z.number()),
  label: z.string(),
  sortKey: z.number(),
});

export const FailedGenerationDraftSchema = z.object({
  id: z.string(),
  contentType: z.enum(['diary', 'forum', 'extras', 'theater', 'letters', 'summaries']),
  rawOutput: z.string(),
  warnings: z.array(z.string()),
  source: SourceSelectionSchema,
  createdAt: z.string(),
});

// ========== 日记 ==========

export const DiaryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: SourceSelectionSchema,
  favorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  perspective: CharacterRefSchema,
  occurredAt: z.string().optional(),
  kind: z.enum(['normal', 'read-reaction']),
  readers: z.array(CharacterRefSchema).optional(),
});

export const DiaryBookSchema = z.object({
  id: z.string(),
  perspective: CharacterRefSchema,
  title: z.string(),
  entries: z.array(DiaryEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DiaryScopeDataSchema = z.object({
  books: z.array(DiaryBookSchema),
  failedDrafts: z.array(FailedGenerationDraftSchema),
});

// ========== 论坛 ==========

export const ForumReplySchema: z.ZodType<{
  id: string;
  author: string;
  content: string;
  parentReplyId?: string;
  source?: z.infer<typeof SourceSelectionSchema>;
  createdAt: string;
  updatedAt: string;
}> = z.object({
  id: z.string(),
  author: z.string(),
  content: z.string(),
  parentReplyId: z.string().optional(),
  source: SourceSelectionSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ForumThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: SourceSelectionSchema,
  favorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  boardId: z.string(),
  author: z.string(),
  replies: z.array(ForumReplySchema),
});

export const ForumBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  threads: z.array(ForumThreadSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ForumScopeDataSchema = z.object({
  boards: z.array(ForumBoardSchema),
  failedDrafts: z.array(FailedGenerationDraftSchema),
});

// ========== 番外 ==========

export const ExtraChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: SourceSelectionSchema,
  favorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  chapterNumber: z.number(),
});

export const ExtraSummarySchema = z.object({
  id: z.string(),
  content: z.string(),
  coveredChapterIds: z.array(z.string()),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ExtraBookSchema = z.object({
  id: z.string(),
  typeId: z.string(),
  typeName: z.string(),
  title: z.string(),
  outline: z.string().optional(),
  chapters: z.array(ExtraChapterSchema),
  summaries: z.array(ExtraSummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ExtrasScopeDataSchema = z.object({
  books: z.array(ExtraBookSchema),
  failedDrafts: z.array(FailedGenerationDraftSchema),
});

// ========== 小剧场 ==========

export const TheaterEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: SourceSelectionSchema,
  favorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  typeId: z.string(),
  typeName: z.string(),
  participants: z.array(CharacterRefSchema),
  renderMode: z.enum(['markdown', 'frontend']),
});

export const TheaterScopeDataSchema = z.object({
  entries: z.array(TheaterEntrySchema),
  failedDrafts: z.array(FailedGenerationDraftSchema),
});

// ========== 书信 ==========

export const LetterEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: SourceSelectionSchema,
  favorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sender: CharacterRefSchema,
  receiver: CharacterRefSchema,
  format: z.enum(['formal', 'note', 'sms', 'email']),
});

export const LetterBookSchema = z.object({
  id: z.string(),
  participantKey: z.string(),
  participants: z.array(CharacterRefSchema),
  title: z.string(),
  entries: z.array(LetterEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LettersScopeDataSchema = z.object({
  books: z.array(LetterBookSchema),
  failedDrafts: z.array(FailedGenerationDraftSchema),
});

// ========== 总结 ==========

export const SummaryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: SourceSelectionSchema,
  favorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rangeLabel: z.string(),
});

export const SummaryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  entries: z.array(SummaryEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SummariesScopeDataSchema = z.object({
  books: z.array(SummaryBookSchema),
  failedDrafts: z.array(FailedGenerationDraftSchema),
});

// ========== 存储 ==========

export const ScopeBindingSchema = z.object({
  ownerKey: z.string(),
  chatId: z.string(),
  displayName: z.string(),
  updatedAt: z.string(),
});

export const StorageDomainIdSchema = z.enum([
  'favorite-snapshots',
  'preferences',
  'text-api-settings',
  'prompt-settings',
  'bagu-rules',
  'wallpaper-index',
]);

export const PhoneStorageIndexSchema = z.object({
  schemaVersion: z.number(),
  revision: z.string(),
  scopeBindings: z.record(z.string(), ScopeBindingSchema),
  scopeFiles: z.record(z.string(), z.record(z.string(), z.string()).partial()),
  globalFiles: z.record(z.string(), z.string()).partial(),
  updatedAt: z.string(),
});

// ========== 收藏 ==========

export const GlobalFavoriteSnapshotSchema = z.object({
  key: z.string(),
  sourceScopeId: z.string(),
  contentType: z.enum(['diary', 'forum', 'extras', 'theater', 'letters', 'summaries']),
  entityId: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  payload: z.union([
    z.object({ type: z.literal('diary'), item: DiaryEntrySchema }),
    z.object({ type: z.literal('forum'), item: ForumThreadSchema }),
    z.object({ type: z.literal('extras'), item: ExtraChapterSchema }),
    z.object({ type: z.literal('theater'), item: TheaterEntrySchema }),
    z.object({ type: z.literal('letters'), item: LetterEntrySchema }),
    z.object({ type: z.literal('summaries'), item: SummaryEntrySchema }),
  ]),
});

// ========== 提示词 ==========

export const TypePromptConfigSchema = z.object({
  id: z.string(),
  domain: z.enum(['extras', 'theater']),
  name: z.string(),
  prompt: z.string(),
  usageCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const QuickPhraseSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const QuickPhraseGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  phrases: z.array(QuickPhraseSchema),
});

export const PromptSettingsDataSchema = z.object({
  appPrompts: z.object({
    diary: z.string(),
    forum: z.string(),
    extras: z.string(),
    theater: z.string(),
    letters: z.string(),
    summaries: z.string(),
  }),
  specialPrompts: z.object({
    diaryReaction: z.string(),
    extraSummary: z.string(),
  }),
  typePrompts: z.array(TypePromptConfigSchema),
  quickPhraseGroups: z.array(QuickPhraseGroupSchema),
});

// ========== 用户偏好 ==========

export const FloatBallSettingsSchema = z.object({
  floatBallEnabled: z.boolean(),
  floatBallSize: z.number().min(28).max(80),
  floatBallColor: z.string(),
  floatBallX: z.number().optional(),
  floatBallY: z.number().optional(),
});

export const HomeScreenLayoutSchema = z.object({
  appOrder: z.array(z.string()),
  hiddenApps: z.array(z.string()),
  dockApps: z.array(z.string()),
});

// ========== 八股 ==========

export const BaguRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['word', 'pattern']),
  find: z.string(),
  replace: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ========== 阅读器 ==========

export const ChatReaderRegexRuleSchema = z.object({
  find: z.string(),
  replace: z.string(),
  flags: z.string(),
});

export const ChatReaderSettingsSchema = z.object({
  title: ChatReaderRegexRuleSchema,
  body: ChatReaderRegexRuleSchema,
  showHiddenAssistantMessages: z.boolean(),
});

// ========== 文件存储 ==========

export const FilePayloadSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    schemaVersion: z.number(),
    kind: z.string(),
    updatedAt: z.string(),
    data: dataSchema,
  });

export const PendingVisibilityRecoveryMessageSchema = z.object({
  messageId: z.number(),
  isHidden: z.boolean(),
  role: z.enum(['system', 'assistant', 'user']),
  name: z.string(),
  contentHash: z.string(),
});

export const PendingVisibilityRecoverySchema = z.object({
  scopeId: z.string(),
  generationId: z.string(),
  createdAt: z.string(),
  messages: z.array(PendingVisibilityRecoveryMessageSchema),
});
