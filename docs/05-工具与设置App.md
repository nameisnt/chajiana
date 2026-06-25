# 05 — 工具与设置 App：实现细节

> 对应 `酒馆手机功能与实现方案.md` §4（工具 App）和 §5（设置 App）
> 本文描述收藏、提示词工坊、聊天统计、阅读聊天、八股去除和设置六个功能的工程实现约束。

---

## 1. 收藏

### 1.1 功能范围

聚合日记/番外/论坛/小剧场/书信/总结中已收藏的内容，支持跨聊天查看。

### 1.2 筛选

- 按内容类型筛选
- 按来源角色筛选
- 按聊天筛选
- 当前聊天收藏可跳转原详情页（通过 `scopeId + entityId`）
- 其他聊天收藏打开只读快照

### 1.3 快照同步

快照采用"跟随原文"语义：

- 原文编辑 → 同步更新快照
- 原文取消收藏 → 同步删除快照
- 原文删除 → 同步删除快照
- 分册删除 → 同步清理其中实体的快照

### 1.4 快照唯一键

`key = ${sourceScopeId}:${contentType}:${entityId}`

同一原文只能有一个快照。编辑、收藏或删除时通过一次 storage index 提交同时切换实体 revision 和快照 revision 指针。

### 1.5 批量操作

- 支持批量取消收藏
- 管理模式多选
- 待删除快照立即从 UI 隐藏

### 1.6 实现注意

- 当前 scope 的收藏列表由六类文件实时派生 `favorite` 字段，不另建容易失步的中间表
- 跨聊天快照只读，不可编辑
- 不能错误跳转到当前聊天的同 ID 内容（必须校验 scopeId）

---

## 2. 提示词工坊

### 2.1 三个页签

| 页签 | 内容 |
|------|------|
| App 提示词 | 日记/论坛/番外/小剧场/书信/总结 + 日记阅读反应 + 番外章节总结 |
| 类型提示词 | 番外类型、小剧场类型 |
| 快速短语 | 分组管理，可一键追加到生成页"额外要求" |

### 2.2 数据结构

```ts
interface PromptSettingsData {
  // 键名与 ContentType 一致（diary/forum/extras/theater/letters/summaries）
  appPrompts: Record<'diary' | 'forum' | 'extras' | 'theater' | 'letters' | 'summaries', string>;
  specialPrompts: Record<'diaryReaction' | 'extraSummary', string>;
  typePrompts: TypePromptConfig[];
  quickPhraseGroups: QuickPhraseGroup[];
}

interface TypePromptConfig {
  id: string;
  domain: 'extras' | 'theater';
  name: string;
  prompt: string;
  usageCount: number;          // 按使用频率排序
  createdAt: string;
  updatedAt: string;
}

interface QuickPhraseGroup {
  id: string;
  name: string;
  phrases: Array<{ id: string; text: string }>;
}
```

### 2.3 类型提示词

- 支持 `{{char}}`、`{{user}}` 替换
- 可新增/修改/删除/预览
- 番外和小剧场各自独立管理

### 2.4 固定输出格式

- App 提示词页面显示对应的 XML 输出格式说明
- 固定输出格式由解析器维护，不可用户编辑
- 始终追加在 `user_input` 末尾

### 2.5 导入导出

- 提示词工坊导入属于独立的小型配置导入
- 固定 App/特殊提示词：按用户勾选逐条覆盖并显示前后预览
- 自定义类型提示词、分组和快速短语：生成新 UUID 后合并
- 名称冲突允许并列但在预览中标记

---

## 3. 聊天统计

### 3.1 展示内容

| 统计项 | 说明 |
|------|------|
| 总楼层 | 当前聊天全部可见消息数 |
| 用户楼层 | `is_user === true` 且非 system 的消息数 |
| AI 楼层 | `is_user === false` 且非 system 的消息数 |
| 总字数 | 所有消息正文的总字符数 |
| 每楼字数分布 | 按楼层展示字数 |
| 角色发言统计 | 按 `name` 分组统计发言次数 |

### 3.2 读取方式

- 读取当前聊天消息数组
- 过滤隐藏楼层（`is_system === true` 或 `is_hidden === true`）
- 每楼取当前选中 swipe（`mes`）

### 3.3 刷新

- 聊天切换后自动刷新，不能沿用上一聊天结果
- 监听 `CHAT_CHANGED` 事件

---

## 4. 阅读聊天

### 4.1 页面流

```
当前角色卡全部聊天目录 → 聊天阅读页 → AI 楼层标题与正文
```

### 4.2 数据读取

- 使用 `TavernHelper.getChatHistoryBrief('current')` 获取目录
- 选中单个 brief 后调用 `getChatHistoryDetail([briefItem])`
- 返回结构：`Record<文件名, 消息数组>`
- 核心字段：`mes`（当前正文）、`is_user`、`is_system`、`swipe_id`、`swipes`

### 4.3 内部转换

通过 `normalizeArchivedMessage()` 将接口返回转为内部强类型。业务组件不得直接使用 `any`。

### 4.4 展示控制

- 只展示 AI 输出楼层：`is_user === false` 且非 narrator/system 类型
- 默认排除已隐藏的 AI 楼层
- 提供"显示隐藏 AI 楼层"开关
- 首屏不批量下载全部聊天全文来统计 AI 楼层数

### 4.5 正则替换

```ts
interface ChatReaderRegexRule {
  find: string;
  replace: string;
  flags: string;                // 只允许 gimsuy，不重复
}

interface ChatReaderSettings {
  title: ChatReaderRegexRule;
  body: ChatReaderRegexRule;
  showHiddenAssistantMessages: boolean;
}
```

- 标题规则对单楼 AI 原文执行替换 → 得到标题
- 正文规则对同一原文独立执行替换 → 得到正文
- 两组规则互不串联
- 规则为空时：标题默认"第 N 楼"，正文默认原文
- 正则无匹配时回退到默认值

### 4.6 Web Worker 执行

- 正则替换在独立 Web Worker 中执行
- 单次任务超时 `1500ms` → 终止 Worker + 保留原文 + 提示灾难性回溯
- 单楼替换结果上限 `2 MiB`，超限视为规则失败
- 失败时整批不提交部分结果
- Worker 的 Blob URL 在任务完成、超时、规则变化、组件卸载时 terminate/revoke
- 长列表使用虚拟滚动渲染

### 4.7 缓存策略

- 目录缓存 brief 数据
- 详情正文仅当前阅读页内缓存
- 离开详情、手动刷新、`CHAT_CHANGED` 后丢弃缓存
- 每次重新打开详情再次调用 `getChatHistoryDetail()`
- 切换角色卡后清空所有缓存

---

## 5. 八股去除

### 5.1 两种运行模式

| 模式 | 触发时机 | 行为 |
|------|---------|------|
| **生成后检测** | 每次生成完成后自动 | 扫描刚生成的正文 → 展示命中提示 → 用户选择应用/不应用/编辑 |
| **批量扫描** | 用户在八股 App 中手动 | 扫描已有内容 → 勾选确认 → 批量应用 |

### 5.2 生成后检测流程

```
生成完成 → 解析得到正文
  → 用启用的规则扫描正文
  → 命中时展示：命中位置、匹配原文、建议替换、上下文高亮
  → 用户选择：应用替换 / 不应用 / 编辑后再应用
```

- 不静默改写 — 必须有用户确认
- 预览页和详情页均可触发检测

### 5.3 规则类型

| 类型 | 说明 |
|------|------|
| 词汇替换规则 | 匹配特定词汇 → 建议替换词 |
| 句式模板规则 | 匹配句式模板 → 建议改写 |

### 5.4 规则管理

- 规则可启用/停用/新增/编辑/删除
- 支持恢复默认规则
- 规则持久化到 `phone-global-bagu-rules-{revisionId}.json`

### 5.5 扫描范围

- 覆盖日记、论坛、番外、小剧场、书信、总结
- 标题搜索 + 类型筛选
- 全选可见 / 取消全选
- 类型筛选栏在窄屏支持横向滚动

---

## 6. 设置

### 6.1 设置分类

| 分类 | 内容 |
|------|------|
| 数据统计 | 各类内容数量、当前聊天数据大小 |
| 数据操作 | ZIP 导出、ZIP 导入、清空当前聊天创作数据 |
| 生成默认值 | 来源楼层模式、额外上下文、结果去向（preview/save）、流式开关 |
| 外观 | 亮/暗主题、壁纸（预设 + 自定义上传）|
| 阅读器 | 字号、行高、重置 |
| 文本通道 | 酒馆当前 API / 外部 OpenAI 兼容 API、URL、Key、模型选择、连接测试 |
| 悬浮球 | 开关、尺寸（28–80px）、颜色 |
| 主屏布局 | App 显隐、排序、Dock、布局重置 |
| 数据恢复 | 待恢复的来源隐藏事务、未绑定 scope 查看/导出/删除 |

### 6.2 约束

- 全部设置在手机设置 App 内完成，不在酒馆扩展设置页创建面板
- 破坏性操作必须二次确认
- 外部 API Key 界面遮罩显示，明文存储提示风险
- 壁纸上传校验 MIME + 扩展名 + 实际图片解码；拒绝 SVG 和伪装成图片的 HTML
