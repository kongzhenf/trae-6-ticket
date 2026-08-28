import { type ReactNode } from 'react'
import PrdButton from './PrdButton'
import PrdSidePanel from './PrdSidePanel'
import { usePrdPanel } from '@/hooks/usePrdPanel'

export interface PrdPanelHostProps {
  /** 当前页面目录名，与 src/pages/ 一致 */
  pageKey: string
  /** 实际页面内容 */
  children: ReactNode
}

/**
 * 业务页面顶层包装：渲染内容，并挂载 PRD 按钮（fixed 在视口右上角）+ 侧边面板。
 * 不包裹 children，避免破坏既有布局（特别是 H5 的 TabBar / NavBar 等）。
 */
export default function PrdPanelHost({ pageKey, children }: PrdPanelHostProps) {
  const { isOpen, toggle, close, markdown } = usePrdPanel(pageKey)

  return (
    <>
      {children}
      <PrdButton isOpen={isOpen} onToggle={toggle} />
      <PrdSidePanel
        open={isOpen}
        onClose={close}
        title={`${pageKey} · PRD`}
        markdown={markdown}
      />
    </>
  )
}
