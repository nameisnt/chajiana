import type { PhoneAppModule } from '@/types';
import ChatStatsPage from './pages/ChatStatsPage.vue';

const module: PhoneAppModule = {
  routes: [{ path: '', component: ChatStatsPage }],
};

export default module;
