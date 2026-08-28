import { useEffect, useState } from 'react'
import { Popup, Field, Cell, Button, Toast } from 'react-vant'
import { isPhone, maskIdCard, maskPhone, ERROR_CODE } from '@trae/shared'
import type { Viewer, ViewerInput } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import { useUser } from '@/contexts/UserContext'

export interface ViewerEditorDialogProps {
  open: boolean
  onClose: () => void
  /** 编辑模式：传入 viewer 时预填字段 */
  viewer?: Viewer
  /**
   * 覆盖归属用户（admin 端可用）；默认从 useUser() 解析
   */
  userIdOverride?: string
  /** 保存成功回调（new Viewer） */
  onSaved: (viewer: Viewer) => void
}

/**
 * 新增 / 编辑观演人弹层（H8 公共组件）
 * - 校验：name 必填 / idCardCipher ≥15 / phone 11 位
 * - 新增：POST /api/v1/viewers
 * - 编辑：PUT /api/v1/viewers/:id
 */
export default function ViewerEditorDialog({
  open,
  onClose,
  viewer,
  userIdOverride,
  onSaved,
}: ViewerEditorDialogProps) {
  const { viewer: api } = useApi()
  const { user } = useUser()
  const [name, setName] = useState('')
  const [idCardCipher, setIdCardCipher] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!viewer

  useEffect(() => {
    if (!open) return
    setName(viewer?.name ?? '')
    setIdCardCipher(viewer?.idCardCipher ?? '')
    setPhone(viewer?.phone ?? '')
  }, [open, viewer])

  const nameValid = name.trim().length > 0
  const idCardValid = idCardCipher.trim().length >= 15
  const phoneValid = isPhone(phone.trim())
  const allValid = nameValid && idCardValid && phoneValid

  async function handleSave() {
    if (!allValid) return
    setSubmitting(true)
    try {
      const payload: ViewerInput = {
        name: name.trim(),
        idCardCipher: idCardCipher.trim(),
        phone: phone.trim(),
      }
      let saved: Viewer
      if (isEdit && viewer) {
        saved = await api.updateViewer(viewer.id, payload)
      } else {
        // admin 端可显式覆盖 userId
        if (userIdOverride) {
          // 通过 client 直接 POST（viewerApi 未暴露 userId 字段；此处扩展）
          const client = api as unknown as { listViewers: unknown; createViewer: (p: ViewerInput & { userId?: string }) => Promise<Viewer> }
          saved = await client.createViewer({ ...payload, userId: userIdOverride })
        } else {
          saved = await api.createViewer(payload)
        }
      }
      // H8 调试：诊断保存失败来源
      console.log('[ViewerEditor] saved:', saved)
      Toast({ type: 'success', message: isEdit ? '已保存' : '已新增' })
      onSaved(saved)
      onClose()
    } catch (e) {
      const er = e as { response?: { data?: { code?: number; message?: string } } }
      const code = er?.response?.data?.code
      console.error('[ViewerEditor] save failed:', er?.response?.data, e)
      Toast({ type: 'fail', message: er?.response?.data?.message ?? ERROR_CODE[code ?? 500001] ?? '保存失败' })
    } finally {
      setSubmitting(false)
    }
  }

  // 仅 admin 模式下提示；C 端 user 自动从 useUser 解析
  const _userHint = userIdOverride && userIdOverride !== user?.id ? `（归属 ${userIdOverride}）` : ''

  return (
    <Popup
      position="bottom"
      round
      closeable
      safeAreaInsetBottom
      visible={open}
      onClose={onClose}
      title={isEdit ? '编辑观演人' : '新增观演人' + _userHint}
      style={{ maxHeight: '90vh' }}
    >
      <div data-testid="viewer-editor-dialog" style={{ padding: '8px 0 16px' }}>
        <Cell.Group inset={false}>
          <Field
            data-testid="viewer-name"
            label="姓名"
            placeholder="请填写真实姓名"
            value={name}
            onChange={(v: string) => setName(v)}
            maxLength={20}
            required
          />
          <Field
            data-testid="viewer-idcard"
            label="身份证号"
            placeholder="至少 15 位（mock 演示用）"
            value={idCardCipher}
            onChange={(v: string) => setIdCardCipher(v)}
            maxLength={20}
            required
          />
          <Field
            data-testid="viewer-phone"
            label="手机号"
            placeholder="11 位手机号（入场核验用）"
            value={phone}
            onChange={(v: string) => setPhone(v)}
            maxLength={11}
            type="tel"
            required
          />
        </Cell.Group>
        {idCardCipher && (
          <div style={{ padding: '0 16px 4px', fontSize: 11, color: '#94a3b8' }}>
            展示预览：{maskIdCard(idCardCipher)} · {maskPhone(phone) || '—'}
          </div>
        )}
        <div style={{ padding: '4px 16px 12px', fontSize: 11, color: allValid ? '#16a34a' : '#dc2626' }}>
          {allValid ? '✓ 信息合法' : '请填写真实姓名、≥15 位身份证号、11 位手机号'}
        </div>
        <div style={{ padding: '0 16px' }}>
          <Button
            type="primary"
            block
            round
            loading={submitting}
            disabled={!allValid || submitting}
            onClick={() => { void handleSave() }}
            data-testid="viewer-editor-save"
          >
            {isEdit ? '保存' : '新增'}
          </Button>
        </div>
      </div>
    </Popup>
  )
}
