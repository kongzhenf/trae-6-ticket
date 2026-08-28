import { type ReactNode } from 'react'
import PrdButton from './PrdButton'
import PrdSidePanel from './PrdSidePanel'
import { usePrdPanel } from '@/hooks/usePrdPanel'

export interface PrdPanelHostProps {
  pageKey: string
  children: ReactNode
}

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
