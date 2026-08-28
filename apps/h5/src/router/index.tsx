import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import TabBarLayout from '@/layouts/TabBarLayout'
import Home from '@/pages/Home'
import ConcertDetail from '@/pages/ConcertDetail'
import TicketTier from '@/pages/TicketTier'
import OrderCreate from '@/pages/OrderCreate'
import OrderDetail from '@/pages/OrderDetail'
import Profile from '@/pages/Profile'
import Login from '@/pages/Login'
import Viewers from '@/pages/Profile/viewers'
import RequireAuth from '@/components/RequireAuth'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <TabBarLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'profile', element: <RequireAuth><Profile /></RequireAuth> },
          /** H8 新增：个人中心 → 观演人 */
          { path: 'profile/viewers', element: <RequireAuth><Viewers /></RequireAuth> },
        ],
      },
      { path: 'login', element: <Login /> },
      { path: 'concerts/:id', element: <ConcertDetail /> },
      { path: 'concerts/:id/tickets', element: <TicketTier /> },
      { path: 'orders/create', element: <RequireAuth><OrderCreate /></RequireAuth> },
      { path: 'orders/:id', element: <RequireAuth><OrderDetail /></RequireAuth> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])