import { Tabbar, TabbarItem } from 'react-vant'
import { Outlet, useNavigate, useMatch } from 'react-router-dom'

/**
 * H5 双 Tab 布局（首页 / 我的）
 * - 用 useMatch 替代 pathname.startsWith，对后续 Phase 4 加入的 /orders Tab 不会误判
 * - 当前只有 2 个 Tab；后续加入订单 Tab 时把 active 计算改为多分支即可
 */
export default function TabBarLayout() {
  const navigate = useNavigate()
  const matchProfile = useMatch('/profile/*')
  const matchHome = useMatch('/')
  const active = matchProfile ? 1 : matchHome ? 0 : 0

  return (
    <div className="app-page">
      <div className="app-page__body" style={{ paddingBottom: 60 }}>
        <Outlet />
      </div>
      <Tabbar value={active} onChange={(v) => navigate(v === 0 ? '/' : '/profile')} fixed>
        <TabbarItem icon="home-o">首页</TabbarItem>
        <TabbarItem icon="user-o">我的</TabbarItem>
      </Tabbar>
    </div>
  )
}
