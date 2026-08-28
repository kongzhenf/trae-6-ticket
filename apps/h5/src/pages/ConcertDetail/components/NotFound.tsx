import { useNavigate } from 'react-router-dom'
import { Button, Empty } from 'react-vant'

export interface NotFoundProps {
  concertId?: string
}

/**
 * 演出不存在 / 已下架 占位组件
 * - 使用 react-vant Empty 保持与全局空态一致
 * - 提供「返回首页」回退入口，避免用户被困
 */
export default function NotFound({ concertId }: NotFoundProps) {
  const navigate = useNavigate()
  return (
    <div
      data-testid="detail-not-found"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
        background: '#f8fafc',
      }}
    >
      <Empty
        imageSize={120}
        description={
          <div style={{ fontSize: 14, color: '#475569', marginTop: 8 }}>
            演出不存在或已下架{concertId ? `（ID：${concertId}）` : ''}
          </div>
        }
      />
      <Button
        round
        type="primary"
        onClick={() => navigate('/', { replace: true })}
        style={{ minWidth: 160 }}
      >
        返回首页
      </Button>
    </div>
  )
}