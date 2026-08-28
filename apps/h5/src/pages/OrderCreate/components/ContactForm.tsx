import { useEffect, useMemo } from 'react'
import { Field, Cell } from 'react-vant'
import { isPhone } from '@trae/shared'
import { useContactDraftStore } from '../stores/contactDraftStore'

export interface ContactFormProps {
  /** 表单校验：联系手机号合法 → true */
  onValidityChange?: (valid: boolean) => void
}

/**
 * 联系信息表单（H8 改造：去掉姓名/身份证，只留手机号）
 * - 字段：手机号（必填，11 位）
 * - 校验：isPhone(value)
 * - H7 user.phone 自动带入由 OrderCreate useEffect 处理；本组件只负责展示与编辑
 */
export default function ContactForm({ onValidityChange }: ContactFormProps) {
  const draft = useContactDraftStore(s => s.draft)
  const setDraft = useContactDraftStore(s => s.setDraft)

  const valid = useMemo(() => isPhone(draft.contactPhone.trim()), [draft.contactPhone])

  useEffect(() => {
    onValidityChange?.(valid)
  }, [valid, onValidityChange])

  return (
    <div
      data-testid="contact-form"
      style={{
        background: '#fff',
        borderRadius: 12,
        margin: '0 12px 12px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ padding: '12px 14px 8px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
        联系信息
      </div>
      <Cell.Group inset={false}>
        <Field
          data-testid="contact-phone"
          label="手机号"
          placeholder="请填写联系手机号（订单通知用）"
          value={draft.contactPhone}
          onChange={(v: string) => setDraft({ contactPhone: v })}
          maxLength={11}
          type="tel"
          required
        />
      </Cell.Group>
      <div style={{ padding: '4px 14px 12px', fontSize: 11, color: valid ? '#16a34a' : '#dc2626' }}>
        {valid ? '✓ 手机号合法' : '请填写 11 位手机号'}
      </div>
    </div>
  )
}
