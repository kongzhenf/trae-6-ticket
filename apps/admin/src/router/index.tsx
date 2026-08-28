import { createBrowserRouter, Navigate } from 'react-router-dom'
import BasicLayout from '@/layouts/BasicLayout'
import BlankLayout from '@/layouts/BlankLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ConcertList from '@/pages/ConcertList'
import ConcertEdit from '@/pages/ConcertEdit'
import TicketManage from '@/pages/TicketManage'
import OrderManage from '@/pages/OrderManage'
import UserManage from '@/pages/UserManage'
import ViewersManage from '@/pages/ViewersManage'
import ExportCenter from '@/pages/ExportCenter'

/**
 * basename 决定 react-router 的根路径前缀
 * - 默认 '/admin'（Vercel 单项目部署布局）
 * - 本地开发如要回到 '/'，可设置 VITE_BASENAME='/'
 */
const basename = import.meta.env.VITE_BASENAME ?? '/admin'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <BlankLayout />,
      children: [{ path: 'login', element: <Login /> }],
    },
    {
      path: '/',
      element: <BasicLayout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <Dashboard /> },
        { path: 'concerts', element: <ConcertList /> },
        { path: 'concerts/:id/edit', element: <ConcertEdit /> },
        { path: 'concerts/:id/tickets', element: <TicketManage /> },
        { path: 'orders', element: <OrderManage /> },
        { path: 'users', element: <UserManage /> },
        /** H8 新增：观演人管理（只读） */
        { path: 'users/viewers', element: <ViewersManage /> },
        /** H10 新增：导出中心 */
        { path: 'exports', element: <ExportCenter /> },
      ],
    },
    { path: '*', element: <Navigate to="/dashboard" replace /> },
  ],
  { basename },
)
