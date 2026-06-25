# 04 — 创作 App 集合：实现细节

> 对应 `酒馆手机功能与实现方案.md` §3（创作 App）
> 本文描述日记、论坛、番外、小剧场、书信、总结六个创作 App 的数据结构、页面流、解析契约和特殊生成逻辑。

---

## 1. 日记

### 1.1 数据结构

```ts
interface DiaryBook {
  id: string;
  perspective: CharacterRef;
  title: string;
  entries: DiaryEntry[];
  createdAt: string;
  updatedAt: string;
}

interface DiaryEntry extends ContentBase {
  perspective: CharacterRef;
  occurredAt?: string;
  kind: 'normal' | 'read-reaction';
  readers?: CharacterRef[];           // 阅读反应模式下不为空
}
```

### 1.2 页面流

```
角色书架 → 日记目录 → 日记详情
                   ↘ 生成 / 批量生成 / 让他人阅读
```

### 1.3 分册规则

- 按视角角色 `CharacterRef` 自动分册（`perspective.id` 或 `perspective.name`）
- 同一角色所有日记归入同一本书
- 可删除整本日记

### 1.4 目录

- 标题搜索
- 正序/倒序切换
- 每项显示标题 + 时间

### 1.5 详情

- 显示：标题、时间、来源、正文
- 操作：上/下条、置顶/底、复制、收藏、编辑、删

### 1.6 批量生成

- 楼层表达式（如 `1-10,15,20-30`）
- AI/User 楼层筛选
- 逐层生成（每层生成一篇）或分组生成
- 进度显示 + 可停止
- 逐项完成来源事务、解析和暂存

### 1.7 让他人阅读

- 选择多篇日记 + 选择阅读者角色
- 生成带 `📖` 标识的反馈日记（`kind: 'read-reaction'`）
- `readers` 记录阅读者列表
- 额外上下文：被阅读的这一篇日记正文

---

## 2. 论坛

### 2.1 数据结构

```ts
interface ForumBoard {
  id: string;
  name: string;
  description?: string;
  threads: ForumThread[];
  createdAt: string;
  updatedAt: string;
}

interface ForumThread extends ContentBase {
  boardId: string;
  author: string;
  replies: ForumReply[];
}

interface ForumReply {
  id: string;
  author: string;
  content: string;
  parentReplyId?: string;        // 楼中楼引用
  source?: SourceSelection;      // 手动回复为空，AI 续回必填
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 页面流

```
板块总览 → 帖子列表 → 帖子详情 → 生成回复 / 手动回复
```

### 2.3 排序方式

| 排序 | 说明 |
|------|------|
| 最新回复 | 按最后回复时间 |
| 最新发布 | 按帖子创建时间 |
| 热度 | 按回复数量 |
| 收藏 | 按当前 scope 内收藏状态 |

### 2.4 帖子详情

- 展示主楼 + 普通回复 + 楼中楼关系（`parentReplyId` 形成树状）
- 复制主楼或单条回复
- 收藏、编辑、删帖

### 2.5 回复生成

- **继续生成回复**：AI 生成新楼层
- **手动添加回复**：用户直接输入
- **回复指定楼层**：设置 `parentReplyId` 形成楼中楼

### 2.6 论坛解析特殊处理

- 首帖返回 `<board><title><author><content><replies>`
- 续回只返回 `<replies>` 部分
- 临时引用 `E1/E2/N1/N2` 在保存时转为真实 `parentReplyId`
- 向后引用、自引用、循环引用 → 降级为普通回复 + 警告

---

## 3. 番外

### 3.1 数据结构

```ts
interface ExtraBook {
  id: string;
  typeId: string;
  typeName: string;
  title: string;
  outline?: string;              // 番外大纲
  chapters: ExtraChapter[];
  summaries: ExtraSummary[];
  createdAt: string;
  updatedAt: string;
}

interface ExtraChapter extends ContentBase {
  chapterNumber: number;
}

interface ExtraSummary {
  id: string;
  content: string;
  coveredChapterIds: string[];   // 覆盖的章节 ID
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 页面流

```
番外书架 → 章节目录 → 章节详情
                   ↘ 新建 / 续写 / 重写 / 批量生成 / 章节总结
```

### 3.3 分册规则

- 按番外类型分册（默认类型 + 自定义类型）
- 类型提示词支持 `{{char}}`、`{{user}}` 替换

### 3.4 章节总结

- AI 对选中章节生成总结
- 保存于书级 `ExtraSummary`
- 可启用、查看、删除
- 续写时：启用的总结替代其覆盖的旧章节，未覆盖章节仍发原文

### 3.5 续写提示词顺序

```
前文内容（续写点之前的全部章节或总结替代部分）
  → 引用素材（如有）
  → App 提示词
  → 类型提示词
  → 用户额外要求
  → 固定输出格式
```

### 3.6 批量生成

- 范围：全部 / 单层 / 指定楼层范围
- 模式：按范围分组 或 指定章数

---

## 4. 小剧场

### 4.1 数据结构

```ts
interface TheaterEntry extends ContentBase {
  typeId: string;
  typeName: string;
  participants: CharacterRef[];
  renderMode: RenderMode;        // 'markdown' | 'frontend'
}
```

### 4.2 类型管理

- 按使用频率排序
- 自定义类型可新增/改/删
- 配置项：参与角色、类型提示词、渲染模式

### 4.3 两种渲染模式

| 模式 | `<content>` 内容 | 渲染方式 |
|------|-------------------|----------|
| Markdown | 文本 / Markdown | 手机自带阅读器（markdown-it + DOMPurify）|
| Frontend | 完整 HTML | iframe sandbox 独立渲染 |

### 4.4 Frontend 渲染链路

```
持久层原始 HTML
  → buildFrontendDocument() 补齐完整文档 + CSP
  → FrontendFrame.vue 写入 iframe.srcdoc
  → iframe 内独立执行 HTML/CSS/JS 并自行滚动
```

### 4.5 iframe 安全沙盒

```
sandbox="allow-scripts"  （不含 allow-same-origin）
```

CSP 注入：

```text
default-src 'none';
img-src https: data: blob:;
media-src https: data: blob:;
font-src https: data:;
style-src 'unsafe-inline' https:;
script-src 'unsafe-inline' https:;
connect-src 'none';
frame-src 'none';
object-src 'none';
base-uri 'none';
form-action 'none';
```

### 4.6 父子通信

- 仅允许 `postMessage` 上报内容高度
- 父组件校验 `event.source === iframe.contentWindow`、channel ID、消息类型、数值范围
- 高度 clamp 到允许范围，失败时回退固定高度

### 4.7 构建规则

`buildFrontendDocument()`：
- HTML 片段 → 自动补充 `doctype`、`meta viewport`、基础样式
- 完整 HTML → 保留 `head`、`style`、`script`、`body`
- 移除 `<base>`、`meta[http-equiv="refresh"]`、嵌套 `<iframe>/<object>/<embed>`
- 固定 CSP 覆盖正文自带 CSP

### 4.8 iframe 生命周期

- 切换详情 / 关闭手机 → 卸载 iframe，清理事件监听和临时 URL
- 普通关闭保留导航栈和详情 ID，不保留运行中的 iframe
- 再次打开时由原始正文重新构造 `srcdoc`
- 持久层只保存原始正文和渲染模式，不保存 iframe DOM 或运行状态
- 检测到第二次顶层 load（自导航尝试）→ 立即卸载 + 提示

---

## 5. 书信

### 5.1 数据结构

```ts
type LetterFormat = 'formal' | 'note' | 'sms' | 'email';

interface LetterBook {
  id: string;
  participantKey: string;       // 参与者组合排序后生成的稳定 key
  participants: CharacterRef[];
  title: string;
  entries: LetterEntry[];
  createdAt: string;
  updatedAt: string;
}

interface LetterEntry extends ContentBase {
  sender: CharacterRef;
  receiver: CharacterRef;
  format: LetterFormat;
}
```

### 5.2 分册规则

- 按角色对分册（`participantKey` 由参与者稳定 ID 排序后生成）
- 发信方向不影响归属 — A→B 和 B→A 归入同一本书
- 可删除整本书信

### 5.3 目录与详情

- 正序/倒序
- 详情：上/下封、置顶/底、复制、收藏、编辑、删

### 5.4 回信

- 自动携带最近 N 封相关往返信件作为上下文
- 用户可在生成界面选择 N 的值
- 生成前仍需选择来源楼层

---

## 6. 总结

### 6.1 数据结构

```ts
interface SummaryBook {
  id: string;
  title: string;
  entries: SummaryEntry[];
  createdAt: string;
  updatedAt: string;
}

interface SummaryEntry extends ContentBase {
  rangeLabel: string;            // 显示用的楼层范围描述
}
```

### 6.2 生成模式

- 单次范围总结：选择范围 → 生成一篇
- 分批总结：指定批次大小 → 分批生成 → 进度显示

### 6.3 限制

- 不提供导入世界书功能
- 详情：复制、收藏、编辑、删
- 按总结集管理条目

---

## 7. 共享数据契约

### 7.1 ContentBase

```ts
interface ContentBase {
  id: string;
  title: string;
  content: string;
  source: SourceSelection;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 7.2 创作内容类型

```ts
type ContentType = 'diary' | 'forum' | 'extras' | 'theater' | 'letters' | 'summaries';
```

### 7.3 通用引用类型

```ts
// 角色引用：id 来自角色卡头像文件或群聊 groupId，name 为显示名
interface CharacterRef {
  id?: string;
  name: string;
}
```

### 7.4 文件数据 JSON 结构

```ts
// 各类型 scope 文件的顶层结构均包含 failedDrafts
interface DiaryScopeData     { books: DiaryBook[];      failedDrafts: FailedGenerationDraft[]; }
interface ForumScopeData     { boards: ForumBoard[];     failedDrafts: FailedGenerationDraft[]; }
interface ExtrasScopeData    { books: ExtraBook[];       failedDrafts: FailedGenerationDraft[]; }
interface TheaterScopeData   { entries: TheaterEntry[];  failedDrafts: FailedGenerationDraft[]; }
interface LettersScopeData   { books: LetterBook[];      failedDrafts: FailedGenerationDraft[]; }
interface SummariesScopeData { books: SummaryBook[];     failedDrafts: FailedGenerationDraft[]; }
```
