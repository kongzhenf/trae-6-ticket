import { Button, Empty, NavBar } from 'react-vant'
import { useNavigate } from 'react-router-dom'

export interface PlaceholderProps {
  title?: string
  description?: string
  showBack?: boolean
}

export default function Placeholder({
  title = '页面占位',
  description = '此页面为骨架占位，详细业务将在后续需求中实现。',
  showBack = true,
}: PlaceholderProps) {
  const navigate = useNavigate()

  return (
    <div className="app-page">
      {showBack && <NavBar title={title} onClickLeft={() => navigate(-1)} />}
      <div className="app-page__body">
        <Empty description={description}>
          <Button type="primary" round onClick={() => navigate('/')}>
            返回首页
          </Button>
        </Empty>
      </div>
    </div>
  )
}
