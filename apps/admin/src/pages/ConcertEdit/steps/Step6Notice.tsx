import { Form, Input, Typography } from 'antd'
import type { ConcertDraft } from '@/stores/concertDraftStore'

const { Text } = Typography

export interface Step6NoticeProps {
  draft: ConcertDraft
  patch: (next: Partial<ConcertDraft>) => void
}

export default function Step6Notice({ draft, patch }: Step6NoticeProps) {
  return (
    <Form layout="vertical" component="div">
      <Form.Item
        label="购票须知"
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            建议包含：实名制说明 / 退改规则 / 入场时间 / 儿童票 / 禁带物品等
          </Text>
        }
      >
        <Input.TextArea
          rows={10}
          maxLength={3000}
          showCount
          placeholder={`示例：\n1. 本场演出实行实名制购票，一证一票。\n2. 演出前 60 分钟开始入场，开演后停止入场。\n3. 1.2m 以下儿童免票（不占座位），1.2m 以上凭票入场。\n4. 禁止携带专业摄影设备及易燃易爆物品。`}
          value={draft.noticeContent}
          onChange={e => patch({ noticeContent: e.target.value })}
        />
      </Form.Item>
    </Form>
  )
}
