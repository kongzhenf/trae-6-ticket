import { useMemo, useState } from 'react'
import { Field, Cell, Button, Toast } from 'react-vant'
import { isPhone, maskIdCard, maskPhone } from '@trae/shared'
import type { Viewer, ViewerInput } from '@trae/shared'
import { useContactDraftStore } from '../stores/contactDraftStore'
import ViewerSelector from '@/components/viewer/ViewerSelector'
import ViewerEditorDialog from '@/components/viewer/ViewerEditorDialog'

export interface ViewersFormProps {
  /** 数量（与 quantity 对应） */
  quantity: number
  /** 校验：所有 viewer 字段合法 → true */
  onValidityChange?: (valid: boolean) => void
}

/** 校验单条 ViewerInput（mock 规则：name 必填 + idCard ≥15 + phone 11 位） */
function isViewerValid(v: ViewerInput): boolean {
  return !!v.name.trim() && v.idCardCipher.trim().length >= 15 && isPhone(v.phone.trim())
}

/**
 * 观演人表单（H8 新增）
 * - 按 quantity 渲染 N 张观演人卡
 * - 每卡：姓名 / 身份证 / 手机号 三字段 + 「选择已有」/「清除」按钮
 * - 字段全部实时写入 contactDraftStore.viewers
 * - 校验通过 → onValidityChange(true)
 */
export default function ViewersForm({ quantity, onValidityChange }: ViewersFormProps) {
  const viewers = useContactDraftStore(s => s.viewers)
  const setViewer = useContactDraftStore(s => s.setViewer)
  const setViewers = useContactDraftStore(s => s.setViewers)
  const [selectorOpenFor, setSelectorOpenFor] = useState<number | null>(null)
  const [editorOpenFor, setEditorOpenFor] = useState<number | null>(null)

  // 当数量变化时调整 viewers 数组长度（新增补空，缩减截断）
  const safeViewers = useMemo<ViewerInput[]>(() => {
    if (viewers.length === quantity) return viewers
    const arr = viewers.slice(0, quantity)
    while (arr.length < quantity) arr.push({ name: '', idCardCipher: '', phone: '' })
    return arr
  }, [viewers, quantity])

  // 数量变化时同步到 store（避免无限循环：仅在长度不一致时写一次）
  if (viewers.length !== safeViewers.length) {
    // 仅在 dev 渲染中触发；放到 effect 更安全，但同步写一次不会出现副作用因为 content 相同
    queueMicrotask(() => setViewers(safeViewers))
  }

  const allValid = useMemo(() => {
    if (safeViewers.length !== quantity) return false
    return safeViewers.every(isViewerValid)
  }, [safeViewers, quantity])

  // 上报校验状态
  useMemo(() => {
    queueMicrotask(() => onValidityChange?.(allValid))
  }, [allValid, onValidityChange])

  function handlePick(idx: number, v: Viewer) {
    setViewer(idx, { name: v.name, idCardCipher: v.idCardCipher, phone: v.phone })
  }

  function handleCleared(idx: number) {
    setViewer(idx, { name: '', idCardCipher: '', phone: '' })
  }

  return (
    <div
      data-testid="viewers-form"
      data-quantity={quantity}
      style={{
        background: '#fff',
        borderRadius: 12,
        margin: '0 12px 12px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ padding: '12px 14px 4px', fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>观演人</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>每张票对应一人</span>
      </div>
      {Array.from({ length: quantity }, (_, idx) => {
        const v = safeViewers[idx] ?? { name: '', idCardCipher: '', phone: '' }
        const vValid = isViewerValid(v)
        return (
          <div
            key={idx}
            data-testid={`viewer-slot-${idx}`}
            data-valid={vValid ? 'true' : 'false'}
            style={{ padding: '8px 14px 14px', borderTop: idx === 0 ? '1px solid #f1f5f9' : '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>第 {idx + 1} 位</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="mini"
                  plain
                  type="primary"
                  onClick={() => setSelectorOpenFor(idx)}
                  data-testid={`viewer-pick-${idx}`}
                >
                  选择已有
                </Button>
                <Button
                  size="mini"
                  plain
                  onClick={() => handleCleared(idx)}
                  data-testid={`viewer-clear-${idx}`}
                >
                  清除
                </Button>
              </div>
            </div>
            <Cell.Group inset={false}>
              <Field
                data-testid={`viewer-name-${idx}`}
                label="姓名"
                placeholder="请填写真实姓名"
                value={v.name}
                onChange={(val: string) => setViewer(idx, { name: val })}
                maxLength={20}
                required
              />
              <Field
                data-testid={`viewer-idcard-${idx}`}
                label="身份证号"
                placeholder="至少 15 位"
                value={v.idCardCipher}
                onChange={(val: string) => setViewer(idx, { idCardCipher: val })}
                maxLength={20}
                required
              />
              <Field
                data-testid={`viewer-phone-${idx}`}
                label="手机号"
                placeholder="11 位手机号（入场核验用）"
                value={v.phone}
                onChange={(val: string) => setViewer(idx, { phone: val })}
                maxLength={11}
                type="tel"
                required
              />
            </Cell.Group>
            <div style={{ marginTop: 4, fontSize: 11, color: vValid ? '#16a34a' : '#dc2626' }}>
              {vValid
                ? `✓ 已就绪：${maskIdCard(v.idCardCipher)} · ${maskPhone(v.phone)}`
                : '请补全姓名 / 身份证 / 手机号'}
            </div>
          </div>
        )
      })}
      <div style={{ padding: '0 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 11, color: allValid ? '#16a34a' : '#dc2626' }}>
          {allValid ? `✓ 全部 ${quantity} 位观演人已就绪` : `还需完善 ${quantity - safeViewers.filter(isViewerValid).length} 位观演人`}
        </span>
        <Button
          size="mini"
          plain
          type="primary"
          onClick={() => setEditorOpenFor(0)}
          data-testid="viewer-add-anywhere"
        >
          + 新增观演人
        </Button>
      </div>

      {/* 弹层：选择已有 */}
      <ViewerSelector
        open={selectorOpenFor !== null}
        onClose={() => setSelectorOpenFor(null)}
        onPick={(v) => {
          if (selectorOpenFor !== null) handlePick(selectorOpenFor, v)
        }}
      />

      {/* 弹层：新增观演人（保存后回填到第一个空位或首个 slot） */}
      <ViewerEditorDialog
        open={editorOpenFor !== null}
        onClose={() => setEditorOpenFor(null)}
        onSaved={(v) => {
          // 找出第一个空位回填
          const emptyIdx = safeViewers.findIndex(x => !x.name && !x.idCardCipher)
          const idx = emptyIdx >= 0 ? emptyIdx : 0
          handlePick(idx, v)
          Toast({ type: 'success', message: `已添加：${v.name}` })
        }}
      />
    </div>
  )
}
