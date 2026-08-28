import { Outlet } from 'react-router-dom'
import DevMockToolbar from '@/components/DevMockToolbar'

export default function BlankLayout() {
  return (
    <>
      <Outlet />
      <DevMockToolbar />
    </>
  )
}