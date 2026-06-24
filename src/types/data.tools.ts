import type { ContentType, FavoriteSnapshotPayload } from './data.base';

// ========== 收藏快照 ==========

export interface GlobalFavoriteSnapshot {
  key: string; // `${sourceScopeId}:${contentType}:${entityId}`
  sourceScopeId: string;
  contentType: ContentType;
  entityId: string;
  title: string;
  updatedAt: string;
  payload: FavoriteSnapshotPayload;
}

export interface PendingFavoriteSync {
  key: string;
  operation: 'upsert' | 'delete';
  expectedEntityUpdatedAt?: string;
  createdAt: string;
}

// ========== 提示词工坊 ==========

export interface TypePromptConfig {
  id: string;
  domain: 'extras' | 'theater';
  name: string;
  prompt: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuickPhraseGroup {
  id: string;
  name: string;
  phrases: Array<{ id: string; text: string }>;
}

export interface PromptSettingsData {
  appPrompts: Record<
    'diary' | 'forum' | 'extras' | 'theater' | 'letters' | 'summaries',
    string
  >;
  specialPrompts: Record<'diaryReaction' | 'extraSummary', string>;
  typePrompts: TypePromptConfig[];
  quickPhraseGroups: QuickPhraseGroup[];
}

// ========== 聊天统计 ==========

export interface ChatStats {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  totalChars: number;
  perMessageChars: Array<{ index: number; chars: number }>;
  roleStats: Array<{ name: string; count: number }>;
}

// ========== 阅读聊天 ==========

export interface ChatReaderRegexRule {
  find: string;
  replace: string;
  flags: string;
}

export interface ChatReaderSettings {
  title: ChatReaderRegexRule;
  body: ChatReaderRegexRule;
  showHiddenAssistantMessages: boolean;
}

// ========== 悬浮球 ==========

export interface FloatBallSettings {
  floatBallEnabled: boolean;
  floatBallSize: number;
  floatBallColor: string;
  floatBallX?: number;
  floatBallY?: number;
}

// ========== 主屏布局 ==========

export interface HomeScreenLayout {
  appOrder: string[];
  hiddenApps: string[];
  dockApps: string[];
}

// ========== 八股规则 ==========

export interface BaguRule {
  id: string;
  type: 'word' | 'pattern';
  find: string;
  replace: string;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
