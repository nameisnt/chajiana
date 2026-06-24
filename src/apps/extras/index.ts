import type { PhoneAppModule } from '@/types';
import { registerAdapter } from '@/generation/adapter-registry';
import { createExtrasAdapter } from './generation';
import ExtrasBookList from './pages/ExtrasBookList.vue';
import ExtrasChapterList from './pages/ExtrasChapterList.vue';
import ExtrasDetail from './pages/ExtrasDetail.vue';
import ExtrasGenerate from './pages/ExtrasGenerate.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: ExtrasBookList },
    { path: 'chapters/:bookId', component: ExtrasChapterList, props: true },
    { path: 'detail/:chapterId', component: ExtrasDetail, props: true },
    { path: 'generate/:bookId', component: ExtrasGenerate, props: true },
  ],
  generationAdapters: [
    createExtrasAdapter('newChapter'),
    createExtrasAdapter('continueChapter'),
  ],
};

// Register adapters eagerly so they are available before lazy load
for (const adapter of module.generationAdapters) {
  registerAdapter(adapter);
}

export default module;
