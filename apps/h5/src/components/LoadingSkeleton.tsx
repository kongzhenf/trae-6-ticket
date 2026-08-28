import { Skeleton } from 'react-vant'

export interface LoadingSkeletonProps {
  /** 卡片骨架行数，默认 4 */
  rows?: number
  /** 是否显示顶部留白（用于 NavBar 下方） */
  topGap?: boolean
}

/**
 * H5 通用加载骨架：react-vant 3.3.5 Skeleton 没有 Image 子组件
 * - 用「头像 + 标题 + 多行段落」单卡片组合，整行 rows 个 stack
 */
export default function LoadingSkeleton({ rows = 4, topGap = true }: LoadingSkeletonProps) {
  const paddingTop = topGap ? '56px ' : ''
  return (
    <div
      className="app-page"
      style={{
        padding: `${paddingTop}16px`,
        background: '#f7f8fa',
        minHeight: '100vh',
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            margin: '0 12px 12px',
          }}
        >
          <Skeleton
            title
            avatar
            avatarShape="square"
            avatarSize="80px"
            row={3}
            rowWidth={['60%', '90%', '40%']}
            rowHeight={['18px', '14px', '14px']}
            loading
            animate
          />
        </div>
      ))}
    </div>
  )
}
