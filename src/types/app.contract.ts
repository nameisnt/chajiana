import type { Component } from 'vue';
import type { z } from 'zod';

/** App 注册定义 */
export interface PhoneAppDefinition {
  id: string;
  name: string;
  icon: string;
  defaultRoute: string;
  defaultVisible: boolean;
  defaultDock: boolean;
  defaultOrder: number;
  load: () => Promise<PhoneAppModule>;
}

/** App 路由定义 */
export interface AppRouteDefinition {
  path: string;
  component: Component;
  props?: boolean | Record<string, unknown>;
}

/** App 懒加载模块 */
export interface PhoneAppModule {
  routes: AppRouteDefinition[];
  generationAdapters?: GenerationAdapter<unknown, unknown>[];
  storageDomains?: StorageDomainDefinition[];
  dispose?: () => void | Promise<void>;
}

/** Storage Domain 定义 */
export interface StorageDomainDefinition {
  id: string;
  scope: 'chat' | 'global';
  schemaVersion: number;
  schema: z.ZodType<unknown>;
  createDefault: () => unknown;
  migrate: (data: unknown, fromVersion: number) => unknown;
}

/** Generation Adapter buildRequest 返回的声明式区段 */
export interface GenerationRequestParts {
  extraContext?: string;
  references?: string;
  appPrompt?: string;
  typePrompt?: string;
  userRequirement?: string;
  outputFormat: string;
}

/** Parse 结果 */
export type ParseResult<T> =
  | { ok: true; data: T; raw: string; warnings: string[] }
  | { ok: false; raw: string; warnings: string[] };

/** save 的参数上下文 */
export interface GenerationSaveContext {
  scopeId: string;
  source: import('./data.base').SourceSelection;
  rawOutput: string;
}

/** Generation Adapter 核心契约 */
export interface GenerationAdapter<TConfig, TResult> {
  appId: string;
  actionId: string;
  configSchema: z.ZodType<TConfig>;
  buildRequest(config: TConfig): GenerationRequestParts;
  parse(raw: string, config: TConfig): ParseResult<TResult>;
  save(result: TResult, context: GenerationSaveContext): Promise<{ entityId: string }>;
}
