import type { PhoneAppModule } from '@/types';
import { registerAdapter } from '@/generation/adapter-registry';
import { createSummaryAdapter } from './generation';
import SummaryApp from './SummaryApp.vue';
import SummaryBookList from './pages/SummaryBookList.vue';
import SummaryEntryList from './pages/SummaryEntryList.vue';
import SummaryDetail from './pages/SummaryDetail.vue';
import SummaryGenerate from './pages/SummaryGenerate.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: SummaryBookList },
    { path: 'entries/:bookId', component: SummaryEntryList, props: true },
    { path: 'detail/:entryId', component: SummaryDetail, props: true },
    { path: 'generate/:bookId', component: SummaryGenerate, props: true },
  ],
  generationAdapters: [createSummaryAdapter()],
};

// 注册主组件为默认路由加载时的入口
export default module;

export { SummaryApp };
