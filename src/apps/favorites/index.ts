import type { PhoneAppModule } from '@/types';
import FavoritesList from './pages/FavoritesList.vue';
import FavoritesDetail from './pages/FavoritesDetail.vue';

const module: PhoneAppModule = {
  routes: [
    { path: '', component: FavoritesList },
    { path: 'detail/:key', component: FavoritesDetail, props: true },
  ],
};

export default module;
