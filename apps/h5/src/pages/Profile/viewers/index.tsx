import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Cell, Dialog, Empty, NavBar, Toast } from 'react-vant'
import { maskIdCard, maskPhone } from '@trae/shared'
import type { Viewer } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import ViewerEditorDialog from '@/components/viewer/ViewerEditorDialog'
import { useViewers } from './hooks/useViewers'

/**
 * 个人中心 → 观演人（H8）
 * - 顶部 NavBar 返回 + 右上「+ 新增观演人」按钮
 * - 列表：姓名 / 身份证脱敏 / 手机号脱敏 / 编辑 / 删除
 * - 空态：还没有观演人，请新增
 */
export default function Viewers() {
  const navigate = useNavigate()
  const { viewers, loading, remove } = useViewers()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Viewer | undefined>(undefined)

  function handleCreate() {
    setEditing(undefined)
    setEditorOpen(true)
  }

  function handleEdit(v: Viewer) {
    setEditing(v)
    setEditorOpen(true)
  }

  function handleDelete(v: Viewer) {
    Dialog.confirm({
      title: '删除观演人',
      message: `确认删除「${v.name}」？删除后无法恢复。`,
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      confirmButtonColor: '#dc2626',
    })
      .then(async () => {
        const ok = await remove(v.id)
        if (ok) Toast({ type: 'success', message: '已删除' })
      })
      .catch(() => undefined)
  }

  return (
    <PrdPanelHost pageKey="Viewers">
      <div
        data-testid="viewers-page"
        style={{ minHeight: '100vh', background: '#f8fafc' }}
      >
        <NavBar
          title="观演人"
          onClickLeft={() => {
            if (window.history.length > 1) navigate(-1)
            else navigate('/profile', { replace: true })
          }}
          rightText={
            <span
              data-testid="viewers-add-btn"
              onClick={handleCreate}
              style={{ color: '#6366f1', fontSize: 14, fontWeight: 600 }}
            >
              + 新增
            </span>
          }
          fixed
          placeholder
          safeAreaInsetTop={false}
        />

        <div style={{ padding: '8px 0 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>加载中…</div>
          ) : viewers.length === 0 ? (
            <Empty description="还没有观演人，请新增" />
          ) : (
            <Cell.Group inset={false}>
              {viewers.map(v => (
                <Cell
                  key={v.id}
                  data-testid={`viewer-row-${v.id}`}
                  title={
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{v.name}</span>
                  }
                  label={
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {maskIdCard(v.idCardCipher)} · {maskPhone(v.phone)}
                    </span>
                  }
                  rightIcon={
                    <span style={{ display: 'flex', gap: 4 }}>
                      <Button
                        size="mini"
                        plain
                        type="primary"
                        onClick={() => handleEdit(v)}
                        data-testid={`viewer-edit-${v.id}`}
                      >
                        编辑
                      </Button>
                      <Button
                        size="mini"
                        plain
                        hairline
                        style={{ color: '#dc2626' }}
                        onClick={() => handleDelete(v)}
                        data-testid={`viewer-delete-${v.id}`}
                      >
                        删除
                      </Button>
                    </span>
                  }
                />
              ))}
            </Cell.Group>
          )}
        </div>

        <div style={{ padding: '0 12px' }}>
          <Button
            type="primary"
            block
            round
            onClick={handleCreate}
            data-testid="viewers-add-bottom"
          >
            + 新增观演人
          </Button>
        </div>

        <ViewerEditorDialog
          open={editorOpen}
          viewer={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => setEditorOpen(false)}
        />
      </div>
    </PrdPanelHost>
  )
}
