import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ApiProvider } from './contexts/ApiContext'
import { UserProvider } from './contexts/UserContext'
import { __peekToken } from './contexts/userToken'
import ErrorBoundary from './components/ErrorBoundary'
import { createApiClient, installMock } from '@trae/api'
import './styles/reset.css'
import './styles/global.css'
import 'react-vant/lib/index.css'

/**
 * H5 客户端装配
 * - baseURL = /api/v1（与 mock router 一致）
 * - mock 安装由 import.meta.env.VITE_USE_MOCK 控制（H1 起默认 true）
 * - H7 起注入 getToken：从 UserContext 模块级缓存读取（__peekToken）
 *   → 每次 axios 请求自动读最新 token，无需 context 依赖
 */
const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const client = createApiClient({
  baseURL,
  timeout: 15000,
  getToken: () => __peekToken(),
})

if (useMock) installMock(client)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApiProvider client={client}>
        <UserProvider>
          <App />
        </UserProvider>
      </ApiProvider>
    </ErrorBoundary>
  </StrictMode>,
)