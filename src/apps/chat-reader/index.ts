import type { PhoneAppModule } from '@/types';
import ChatReaderList from './pages/ChatReaderList.vue';
import ChatReaderView from './pages/ChatReaderView.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: ChatReaderList },
    { path: 'read/:chatFileName', component: ChatReaderView, props: true },
  ],
};

export default module;
