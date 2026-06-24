import type { PhoneAppModule } from '@/types';
import SettingsPage from './pages/SettingsPage.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: SettingsPage },
  ],
};

export default module;
