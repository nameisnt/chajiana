import type { GenerationConfig, TextProvider } from '@/types';

/** 生成服务内部配置 */
export interface GenerationServiceConfig {
  generationId: string;
  config: GenerationConfig;
  textProvider: TextProvider;
  onStreamText?: (text: string) => void;
  abortController?: AbortController;
}

/** 生成状态 */
export type GenerationStatus =
  | 'idle'
  | 'validating'
  | 'acquiring_lock'
  | 'snapshotting'
  | 'hiding'
  | 'generating'
  | 'restoring'
  | 'parsing'
  | 'saving'
  | 'completed'
  | 'stopped'
  | 'failed';

/** 生成进度事件 */
export interface GenerationProgress {
  status: GenerationStatus;
  message?: string;
  streamText?: string;
}
