/** 导航栈条目 */
export interface NavState {
  appId: string;
  page: string;
  title: string;
  params?: Record<string, string>;
  origin?: 'home' | 'favorites';
}
