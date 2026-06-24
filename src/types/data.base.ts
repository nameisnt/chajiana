/** 角色引用 */
export interface CharacterRef {
  id?: string;
  name: string;
}

/**
 * 创作内容类型
 * diary | forum | extras | theater | letters | summaries
 */
export type ContentType = 'diary' | 'forum' | 'extras' | 'theater' | 'letters' | 'summaries';

/** 来源楼层选择模式 */
export type SourceMode = 'latest' | 'fromStart' | 'all' | 'single' | 'recent' | 'range';

/** 来源楼层选择 */
export interface SourceSelection {
  scopeId: string;
  chatIdAtGeneration: string;
  mode: SourceMode;
  ranges: Array<{ start: number; end: number }>;
  messageIds: number[];
  label: string;
  sortKey: number;
}

/** 所有创作内容的共享基类 */
export interface ContentBase {
  id: string;
  title: string;
  content: string;
  source: SourceSelection;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 渲染模式 */
export type RenderMode = 'markdown' | 'frontend';

/** 书信格式 */
export type LetterFormat = 'formal' | 'note' | 'sms' | 'email';

/** 文本生成通道 */
export type TextProvider =
  | { mode: 'tavern' }
  | { mode: 'external'; apiUrl: string; apiKey?: string; model: string; contextWindow?: number; maxOutputTokens?: number };

/** 生成配置 */
export interface GenerationConfig {
  sourceMode: SourceMode;
  sourceRanges: Array<{ start: number; end: number }>;
  resultMode: 'preview' | 'save';
  stream: boolean;
}

/** 失败的生成草稿 */
export interface FailedGenerationDraft {
  id: string;
  contentType: ContentType;
  rawOutput: string;
  warnings: string[];
  source: SourceSelection;
  createdAt: string;
}

/** 收藏快照 payload 类型（6 类 discriminated union） */
export type FavoriteSnapshotPayload =
  | { type: 'diary'; item: import('./data.creative').DiaryEntry }
  | { type: 'forum'; item: import('./data.creative').ForumThread }
  | { type: 'extras'; item: import('./data.creative').ExtraChapter }
  | { type: 'theater'; item: import('./data.creative').TheaterEntry }
  | { type: 'letters'; item: import('./data.creative').LetterEntry }
  | { type: 'summaries'; item: import('./data.creative').SummaryEntry };
