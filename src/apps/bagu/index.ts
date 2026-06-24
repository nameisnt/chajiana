import type { PhoneAppModule } from '@/types';
import BaguPage from './pages/BaguPage.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: BaguPage },
  ],
};

export default module;
