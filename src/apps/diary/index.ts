import type { PhoneAppModule } from '@/types';
import { registerAdapter } from '@/generation/adapter-registry';
import { createDiaryAdapter } from './generation';
import DiaryBookList from './pages/DiaryBookList.vue';
import DiaryEntryList from './pages/DiaryEntryList.vue';
import DiaryDetail from './pages/DiaryDetail.vue';
import DiaryGenerate from './pages/DiaryGenerate.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: DiaryBookList },
    { path: 'entries/:bookId', component: DiaryEntryList, props: true },
    { path: 'detail/:entryId', component: DiaryDetail, props: true },
    { path: 'generate/:bookId', component: DiaryGenerate, props: true },
  ],
  generationAdapters: [createDiaryAdapter('normal'), createDiaryAdapter('readReaction')],
};

export default module;
