/** Storage index 中每个 scope 的绑定信息 */
export interface ScopeBinding {
  ownerKey: string; // 单角色: char:{avatarId}, 群聊: group:{groupId}
  chatId: string;
  displayName: string;
  updatedAt: string;
}

/** 全局存储 domain ID 枚举 */
export type StorageDomainId =
  | 'favorite-snapshots'
  | 'preferences'
  | 'text-api-settings'
  | 'prompt-settings'
  | 'bagu-rules'
  | 'wallpaper-index';

/** 聊天级 domain ID（contentType） */
export type ChatDomainId = 'diary' | 'forum' | 'extras' | 'theater' | 'letters' | 'summaries';

/** 总的 storage index */
export interface PhoneStorageIndex {
  schemaVersion: number;
  revision: string;
  scopeBindings: Record<string, ScopeBinding>;
  scopeFiles: Record<string, Partial<Record<ChatDomainId, string>>>;
  globalFiles: Partial<Record<StorageDomainId, string>>;
  updatedAt: string;
}

/** 来源隐藏恢复日志条目 */
export interface PendingVisibilityRecoveryMessage {
  messageId: number;
  isHidden: boolean;
  role: 'system' | 'assistant' | 'user';
  name: string;
  contentHash: string; // SHA-256 of role + name + 当前swipe正文
}

/** 来源隐藏崩溃恢复日志 */
export interface PendingVisibilityRecovery {
  scopeId: string;
  generationId: string;
  createdAt: string;
  messages: PendingVisibilityRecoveryMessage[];
}

/** Settings 兜底中的插件数据结构 */
export interface SillyTavernPhoneSettings {
  scopeId?: string;
  pendingVisibilityRecoveries?: Record<string, PendingVisibilityRecovery>;
  indexMirror?: PhoneStorageIndex;
  operationLog?: Record<string, string>;
  pendingFavoriteSyncs?: Record<string, import('./data.tools').PendingFavoriteSync>;
  fallbackData?: Record<string, unknown>;
}

/** 文件 payload 封装 */
export interface FilePayload<T = unknown> {
  schemaVersion: number;
  kind: string;
  updatedAt: string;
  data: T;
}
