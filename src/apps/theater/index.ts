import type { PhoneAppModule } from '@/types';
import { createTheaterAdapter } from './generation';
import TheaterTypeList from './pages/TheaterTypeList.vue';
import TheaterEntryList from './pages/TheaterEntryList.vue';
import TheaterDetail from './pages/TheaterDetail.vue';
import TheaterGenerate from './pages/TheaterGenerate.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: TheaterTypeList },
    { path: 'entries/:typeId', component: TheaterEntryList, props: true },
    { path: 'detail/:entryId', component: TheaterDetail, props: true },
    { path: 'generate/:typeId', component: TheaterGenerate, props: true },
  ],
  generationAdapters: [createTheaterAdapter()],
};

export default module;
