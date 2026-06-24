import type { PhoneAppModule } from '@/types';
import { registerAdapter } from '@/generation/adapter-registry';
import { createForumAdapter } from './generation';
import ForumBoardList from './pages/ForumBoardList.vue';
import ForumThreadList from './pages/ForumThreadList.vue';
import ForumDetail from './pages/ForumDetail.vue';
import ForumGenerate from './pages/ForumGenerate.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: ForumBoardList },
    { path: 'threads/:boardId', component: ForumThreadList, props: true },
    { path: 'detail/:threadId', component: ForumDetail, props: true },
    { path: 'generate/:boardId', component: ForumGenerate, props: true },
  ],
  generationAdapters: [
    createForumAdapter('newThread'),
    createForumAdapter('continueReply'),
  ],
};

// Register adapters eagerly so they are available before lazy load
for (const adapter of module.generationAdapters) {
  registerAdapter(adapter);
}

export default module;
