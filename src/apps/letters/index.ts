import type { PhoneAppModule } from '@/types';
import { createNewLetterAdapter, createReplyLetterAdapter } from './generation';
import LettersBookList from './pages/LettersBookList.vue';
import LettersEntryList from './pages/LettersEntryList.vue';
import LettersDetail from './pages/LettersDetail.vue';
import LettersGenerate from './pages/LettersGenerate.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: LettersBookList },
    { path: 'entries/:bookId', component: LettersEntryList, props: true },
    { path: 'detail/:entryId', component: LettersDetail, props: true },
    { path: 'generate/:bookId', component: LettersGenerate, props: true },
  ],
  generationAdapters: [createNewLetterAdapter(), createReplyLetterAdapter()],
};

export default module;
