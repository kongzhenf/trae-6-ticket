import { Form, Input, Space, Typography } from 'antd'
import type { ConcertDraft } from '@/stores/concertDraftStore'

const { Text } = Typography

export interface Step2DetailProps {
  draft: ConcertDraft
  patch: (next: Partial<ConcertDraft>) => void
}

export default function Step2Detail({ draft, patch }: Step2DetailProps) {
  return (
    <Form layout="vertical" component="div">
      <Form.Item
        label={
          <Space>
            <span>活动详情</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              （后续接入富文本编辑器）
            </Text>
          </Space>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            TODO（M4 范围外）：@wangeditor / @tinymce / 平台自研富文本编辑器
          </Text>
        }
      >
        <Input.TextArea
          rows={10}
          maxLength={5000}
          showCount
          placeholder="支持 Markdown；可写活动介绍、节目亮点、嘉宾阵容、入场须知等。"
          value={draft.detailContent}
          onChange={e => patch({ detailContent: e.target.value })}
        />
      </Form.Item>
    </Form>
  )
}
