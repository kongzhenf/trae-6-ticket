import { Card, Typography } from 'antd'

const { Title, Paragraph } = Typography

export interface PlaceholderProps {
  title?: string
  description?: string
}

export default function Placeholder({
  title = '页面占位',
  description = '此页面为骨架占位，详细业务将在后续需求中实现。',
}: PlaceholderProps) {
  return (
    <Card>
      <Title level={3}>{title}</Title>
      <Paragraph type="secondary">{description}</Paragraph>
    </Card>
  )
}
