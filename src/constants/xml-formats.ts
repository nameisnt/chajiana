/** 日记 / 总结 / 番外章节 / 小剧场（Markdown 模式） */
export const XML_FORMAT_BASIC = `<result>
  <title>标题</title>
  <content>正文内容</content>
</result>`;

/** 书信 */
export const XML_FORMAT_LETTER = `<result>
  <title>标题</title>
  <content>正文内容</content>
</result>`;

/** 论坛首帖 */
export const XML_FORMAT_FORUM_THREAD = `<result>
  <board>板块名</board>
  <title>帖子标题</title>
  <author>作者名</author>
  <content>主楼正文</content>
  <replies>
    <reply>
      <author>回复作者</author>
      <content>回复内容</content>
      <parent_ref>E1</parent_ref>
    </reply>
  </replies>
</result>`;

/** 论坛续回 */
export const XML_FORMAT_FORUM_REPLY = `<replies>
  <reply>
    <author>回复作者</author>
    <content>回复内容</content>
    <parent_ref>E1</parent_ref>
  </reply>
</replies>`;

/** 各 App 的固定输出格式映射 */
export const APP_XML_FORMATS: Record<string, (actionId: string) => string> = {
  summary: () => XML_FORMAT_BASIC,
  diary: () => XML_FORMAT_BASIC,
  extras: () => XML_FORMAT_BASIC,
  theater: () => XML_FORMAT_BASIC,
  letters: () => XML_FORMAT_LETTER,
  forum: (actionId: string) => {
    if (actionId === 'continueReply') {
      return XML_FORMAT_FORUM_REPLY;
    }
    return XML_FORMAT_FORUM_THREAD;
  },
};
