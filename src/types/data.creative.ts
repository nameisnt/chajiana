import type { ContentBase, CharacterRef, FailedGenerationDraft, RenderMode, LetterFormat } from './data.base';

// ========== 日记 ==========

export interface DiaryBook {
  id: string;
  perspective: CharacterRef;
  title: string;
  entries: DiaryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry extends ContentBase {
  perspective: CharacterRef;
  occurredAt?: string;
  kind: 'normal' | 'read-reaction';
  readers?: CharacterRef[];
}

export interface DiaryScopeData {
  books: DiaryBook[];
  failedDrafts: FailedGenerationDraft[];
}

// ========== 论坛 ==========

export interface ForumBoard {
  id: string;
  name: string;
  description?: string;
  threads: ForumThread[];
  createdAt: string;
  updatedAt: string;
}

export interface ForumThread extends ContentBase {
  boardId: string;
  author: string;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  author: string;
  content: string;
  parentReplyId?: string;
  source?: import('./data.base').SourceSelection;
  createdAt: string;
  updatedAt: string;
}

export interface ForumScopeData {
  boards: ForumBoard[];
  failedDrafts: FailedGenerationDraft[];
}

// ========== 番外 ==========

export interface ExtraBook {
  id: string;
  typeId: string;
  typeName: string;
  title: string;
  outline?: string;
  chapters: ExtraChapter[];
  summaries: ExtraSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtraChapter extends ContentBase {
  chapterNumber: number;
}

export interface ExtraSummary {
  id: string;
  content: string;
  coveredChapterIds: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtrasScopeData {
  books: ExtraBook[];
  failedDrafts: FailedGenerationDraft[];
}

// ========== 小剧场 ==========

export interface TheaterEntry extends ContentBase {
  typeId: string;
  typeName: string;
  participants: CharacterRef[];
  renderMode: RenderMode;
}

export interface TheaterScopeData {
  entries: TheaterEntry[];
  failedDrafts: FailedGenerationDraft[];
}

// ========== 书信 ==========

export interface LetterBook {
  id: string;
  participantKey: string;
  participants: CharacterRef[];
  title: string;
  entries: LetterEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface LetterEntry extends ContentBase {
  sender: CharacterRef;
  receiver: CharacterRef;
  format: LetterFormat;
}

export interface LettersScopeData {
  books: LetterBook[];
  failedDrafts: FailedGenerationDraft[];
}

// ========== 总结 ==========

export interface SummaryBook {
  id: string;
  title: string;
  entries: SummaryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SummaryEntry extends ContentBase {
  rangeLabel: string;
}

export interface SummariesScopeData {
  books: SummaryBook[];
  failedDrafts: FailedGenerationDraft[];
}
