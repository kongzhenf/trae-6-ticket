import { Button, Empty } from 'react-vant'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryText?: string
}

/**
 * H5 通用错误占位：图标 + 文案 + 重试按钮
 */
export default function ErrorState({
  title = '加载失败',
  description,
  onRetry,
  retryText = '重试',
}: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: '#fff',
      }}
    >
      <Empty
        image="error"
        description={
          <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#0f172a', marginBottom: 6 }}>{title}</div>
            {description && <div>{description}</div>}
          </div>
        }
      />
      {onRetry && (
        <Button type="primary" round onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  )
}
