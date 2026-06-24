import type { PhoneAppModule } from '@/types';
import PromptsWorkshop from './pages/PromptsWorkshop.vue';

const module: PhoneAppModule = {
  routes: [{ path: '', component: PromptsWorkshop }],
};

export default module;
