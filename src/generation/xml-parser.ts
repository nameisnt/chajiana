import type { ContentType, ParseResult } from '@/types';

/**
 * 从文本中提取第一个完整 <result> 标签内的内容
 */
function extractResultBlock(raw: string): string | null {
  const startIdx = raw.indexOf('<result>');
  if (startIdx === -1) return null;

  const endIdx = raw.indexOf('</result>', startIdx);
  if (endIdx === -1) return null;

  return raw.substring(startIdx, endIdx + '</result>'.length);
}

/**
 * 从 result 块中提取子标签内容
 */
function extractTag(resultBlock: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const match = resultBlock.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * 从 result 块中提取所有 replies
 */
function extractReplies(
  resultBlock: string,
): Array<{ author: string; content: string; parentRef: string }> {
  const replies: Array<{ author: string; content: string; parentRef: string }> = [];
  const replyRegex = /<reply>([\s\S]*?)<\/reply>/gi;
  let match: RegExpExecArray | null;

  while ((match = replyRegex.exec(resultBlock)) !== null) {
    const replyBlock = match[1];
    const author = extractTag(`<reply>${replyBlock}</reply>`, 'author') ?? '';
    const content = extractTag(`<reply>${replyBlock}</reply>`, 'content') ?? '';
    const parentRef = extractTag(`<reply>${replyBlock}</reply>`, 'parent_ref') ?? '';
    replies.push({ author, content, parentRef });
  }

  return replies;
}

/**
 * 解析基础类型（日记 / 番外章节 / 小剧场 / 总结）
 * 格式: <result><title>...</title><content>...</content></result>
 */
function parseBasicResult(
  raw: string,
): { title: string; content: string } | { warnings: string[] } {
  const resultBlock = extractResultBlock(raw);
  if (!resultBlock) {
    return { warnings: ['未找到 <result> 标签'] };
  }

  const title = extractTag(resultBlock, 'title');
  const content = extractTag(resultBlock, 'content');

  const warnings: string[] = [];
  if (!title) warnings.push('缺少 <title> 标签');
  if (!content) warnings.push('缺少 <content> 标签');

  if (!title || !content) {
    return { warnings };
  }

  return { title, content };
}

/**
 * 解析论坛结果
 * 格式: <result><board>...</board><title>...</title><author>...</author><content>...</content><replies>...</replies></result>
 */
function parseForumResult(raw: string): {
  board?: string;
  title?: string;
  author?: string;
  content?: string;
  replies: Array<{ author: string; content: string; parentRef: string }>;
  warnings: string[];
} {
  const resultBlock = extractResultBlock(raw);
  if (!resultBlock) {
    return { replies: [], warnings: ['未找到 <result> 标签'] };
  }

  const warnings: string[] = [];
  const board = extractTag(resultBlock, 'board') ?? undefined;
  const title = extractTag(resultBlock, 'title') ?? undefined;
  const author = extractTag(resultBlock, 'author') ?? undefined;
  const content = extractTag(resultBlock, 'content') ?? undefined;

  if (!board) warnings.push('缺少 <board> 标签');
  if (!title) warnings.push('缺少 <title> 标签');
  if (!author) warnings.push('缺少 <author> 标签');
  if (!content) warnings.push('缺少 <content> 标签');

  const replies = extractReplies(resultBlock);

  return { board, title, author, content, replies, warnings };
}

/**
 * 解析论坛续回结果
 * 格式: <replies>...</replies>
 */
function parseForumRepliesResult(raw: string): {
  replies: Array<{ author: string; content: string; parentRef: string }>;
  warnings: string[];
} {
  const replies = extractReplies(raw);
  const warnings: string[] = replies.length === 0 ? ['未找到 <reply> 标签'] : [];
  return { replies, warnings };
}

/**
 * 主解析函数
 */
export function parseGenerationResult<T>(
  raw: string,
  contentType: ContentType,
  actionId: string,
): ParseResult<T> {
  const warnings: string[] = [];

  if (contentType === 'forum' && actionId === 'continueReply') {
    const { replies, warnings: w } = parseForumRepliesResult(raw);
    warnings.push(...w);
    if (replies.length === 0) {
      return { ok: false, raw, warnings };
    }
    return { ok: true, data: { replies } as unknown as T, raw, warnings };
  }

  if (contentType === 'forum') {
    const result = parseForumResult(raw);
    warnings.push(...result.warnings);
    if (!result.title && !result.content) {
      return { ok: false, raw, warnings };
    }
    return { ok: true, data: result as unknown as T, raw, warnings };
  }

  // 基础类型：日记、番外、小剧场、总结、书信
  const result = parseBasicResult(raw);
  if ('warnings' in result && result.warnings.length > 0 && !('title' in result)) {
    return { ok: false, raw, warnings: [...warnings, ...result.warnings] };
  }
  if ('title' in result) {
    return { ok: true, data: result as unknown as T, raw, warnings };
  }
  return { ok: false, raw, warnings: [...warnings, ...((result as { warnings: string[] }).warnings)] };
}

/**
 * 解析论坛回复中的临时引用 (E1/E2/N1/N2)
 * 在保存时转为真实 parentReplyId
 */
export function resolveForumTempRefs(
  replies: Array<{ id: string; author: string; content: string; parentRef: string }>,
  existingReplies: Array<{ id: string; author: string }>,
): { resolved: typeof replies; warnings: string[] } {
  const warnings: string[] = [];
  const refMap = new Map<string, string>();

  // E1..N = 已有回复 (Existing)
  // N1..N = 新生成的回复 (New)
  for (let i = 0; i < existingReplies.length; i++) {
    refMap.set(`E${i + 1}`, existingReplies[i].id);
  }

  for (let i = 0; i < replies.length; i++) {
    refMap.set(`N${i + 1}`, replies[i].id);
  }

  const resolved = replies.map((reply, i) => {
    const rawRef = reply.parentRef?.trim();
    if (!rawRef) return reply;

    const targetId = refMap.get(rawRef);
    if (!targetId) {
      warnings.push(`回复 N${i + 1} 引用了不存在的引用 ${rawRef}，降级为普通回复`);
      return { ...reply, parentRef: '' };
    }

    // 检测自引用和循环引用
    if (targetId === reply.id) {
      warnings.push(`回复 N${i + 1} 自引用，降级为普通回复`);
      return { ...reply, parentRef: '' };
    }

    return { ...reply, parentRef: targetId };
  });

  return { resolved, warnings };
}
