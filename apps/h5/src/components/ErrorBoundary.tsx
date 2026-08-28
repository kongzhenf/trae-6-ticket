import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Empty } from 'react-vant'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * H5 全局错误边界：捕获子树 throw 时显示「页面出错了，点此重试」
 * - 重试按钮强制 reload 整个 H5 路由
 * - 仅 dev 模式打印 stack；prod 静默
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(e: Error): State {
    return { hasError: true, message: e?.message ?? '未知错误' }
  }

  componentDidCatch(e: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[H5 ErrorBoundary]', e, info.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' })
    // 强制 reload 整个 SPA，最稳的兜底
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="app-page"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            background: '#fff',
          }}
        >
          <Empty
            image="error"
            description={
              <div style={{ color: '#64748b', fontSize: 14 }}>
                <div style={{ fontSize: 16, color: '#0f172a', marginBottom: 6 }}>
                  页面出错了
                </div>
                {this.state.message && <div>{this.state.message}</div>}
              </div>
            }
          />
          <Button type="primary" round onClick={this.handleRetry}>
            重新加载
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
