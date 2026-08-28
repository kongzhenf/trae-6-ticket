import { Alert, Form, Space, Switch, Typography } from 'antd'
import type { ConcertDraft } from '@/stores/concertDraftStore'

const { Text, Paragraph } = Typography

export interface Step4BuyerFieldsProps {
  draft: ConcertDraft
  patch: (next: Partial<ConcertDraft>) => void
  errors?: Record<string, string>
}

export default function Step4BuyerFields({ draft, patch, errors = {} }: Step4BuyerFieldsProps) {
  const requiredCount =
    (draft.buyerNameRequired ? 1 : 0) +
    (draft.idCardRequired ? 1 : 0) +
    (draft.mobileRequired ? 1 : 0)
  const noRequired = requiredCount === 0

  return (
    <Form layout="vertical" component="div">
      <Paragraph type="secondary">
        配置购票时用户需填写的实名信息。手机号始终必填（PRD §5 要求实名购票一证一票）。
      </Paragraph>

      <Form.Item label="姓名" tooltip="用户真实姓名">
        <Space>
          <Switch
            checked={draft.buyerNameRequired}
            onChange={c => patch({ buyerNameRequired: c })}
            checkedChildren="必填"
            unCheckedChildren="选填"
          />
          <Text type="secondary">{draft.buyerNameRequired ? '必填' : '选填'}</Text>
        </Space>
      </Form.Item>

      <Form.Item label="身份证号" tooltip="实名核验，PRD §7 要求一证一票">
        <Space>
          <Switch
            checked={draft.idCardRequired}
            onChange={c => patch({ idCardRequired: c })}
            checkedChildren="必填"
            unCheckedChildren="选填"
          />
          <Text type="secondary">{draft.idCardRequired ? '必填' : '选填'}</Text>
        </Space>
      </Form.Item>

      <Form.Item label="手机号" tooltip="订单通知必需，不可关闭">
        <Space>
          <Switch checked disabled checkedChildren="必填" unCheckedChildren="必填" />
          <Text type="secondary">必填（不可关闭）</Text>
        </Space>
      </Form.Item>

      {noRequired && (
        <Alert
          type="warning"
          showIcon
          title="至少保留 1 个必填字段（除手机号外）"
          description="如全部关闭会导致匿名购票，违反实名要求"
          style={{ marginTop: 8 }}
        />
      )}

      {errors.buyerFields && (
        <Alert
          type="error"
          showIcon
          title={errors.buyerFields}
          style={{ marginTop: 8 }}
        />
      )}
    </Form>
  )
}
