import { Empty } from 'react-vant'

export interface EmptyStateProps {
  description?: string
  /** 留白高度（默认 200），用于让空态在页面中部 */
  height?: number | string
}

/**
 * H5 通用空态占位
 */
export default function EmptyState({
  description = '暂无数据',
  height = 240,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: typeof height === 'number' ? `${height}px` : height,
        background: '#fff',
        padding: '24px 16px',
      }}
    >
      <Empty
        image="default"
        description={
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{description}</div>
        }
      />
    </div>
  )
}
