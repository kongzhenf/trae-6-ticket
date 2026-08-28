import { useEffect, useState } from 'react'
import { Popup, Cell, Button, Empty, Toast } from 'react-vant'
import { maskIdCard, maskPhone } from '@trae/shared'
import type { Viewer } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import { useUser } from '@/contexts/UserContext'
import ViewerEditorDialog from './ViewerEditorDialog'

export interface ViewerSelectorProps {
  open: boolean
  onClose: () => void
  /** 选择某 viewer 后回调 */
  onPick: (viewer: Viewer) => void
  /** 选择完成后是否关闭弹层（默认 true） */
  closeOnPick?: boolean
}

/**
 * 选择已有观演人弹层（H8 公共组件）
 * - 列当前 user 的所有 viewer（按 updatedAt 倒序）
 * - 顶部「+ 新增观演人」按钮 → 触发 ViewerEditorDialog
 * - 点击某行 → 选中并关闭（除非 closeOnPick=false）
 */
export default function ViewerSelector({
  open,
  onClose,
  onPick,
  closeOnPick = true,
}: ViewerSelectorProps) {
  const { viewer: api } = useApi()
  const { user } = useUser()
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    api.listViewers(user.id)
      .then(list => setViewers(list))
      .catch(() => Toast('加载观演人失败'))
      .finally(() => setLoading(false))
  }, [open, user, reloadKey, api])

  function handlePick(v: Viewer) {
    onPick(v)
    if (closeOnPick) onClose()
  }

  function handleCreated(v: Viewer) {
    setReloadKey(k => k + 1)
    onPick(v)
    setEditorOpen(false)
    if (closeOnPick) onClose()
  }

  return (
    <>
      <Popup
        position="bottom"
        round
        closeable
        safeAreaInsetBottom
        visible={open}
        onClose={onClose}
        title="选择观演人"
        style={{ maxHeight: '80vh' }}
      >
        <div data-testid="viewer-selector" style={{ padding: '12px 0 16px' }}>
          <div style={{ padding: '0 16px 8px' }}>
            <Button
              type="primary"
              block
              plain
              onClick={() => setEditorOpen(true)}
              data-testid="viewer-selector-add"
            >
              + 新增观演人
            </Button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>加载中…</div>
          ) : viewers.length === 0 ? (
            <Empty description="还没有观演人，请新增" />
          ) : (
            <Cell.Group inset={false}>
              {viewers.map(v => (
                <Cell
                  key={v.id}
                  data-testid={`viewer-row-${v.id}`}
                  clickable
                  onClick={() => handlePick(v)}
                  title={v.name}
                  label={`${maskIdCard(v.idCardCipher)} · ${maskPhone(v.phone)}`}
                />
              ))}
            </Cell.Group>
          )}
        </div>
      </Popup>

      <ViewerEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={handleCreated}
      />
    </>
  )
}
