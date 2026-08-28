import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import { createApiClient, installMock } from '@trae/api'
import App from './App'
import { ApiProvider } from './contexts/ApiContext'
import './styles/global.css'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/admin/v1'
const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

const client = createApiClient({ baseURL, timeout: 15000 })
if (useMock) installMock(client)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntdApp>
        <ApiProvider client={client}>
          <App />
        </ApiProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)