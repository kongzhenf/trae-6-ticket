import { useEffect, useState } from 'react'

/**
 * 通用 PRD 侧边栏状态管理 hook。
 *
 * 通过 Vite 的 `import.meta.glob` 在构建时收集所有 `./pages/<Page>/prd.md` 文件，
 * 页面调用时只需提供自身相对路径即可。
 */
const mdModules = import.meta.glob('../pages/*/prd.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const mdMap: Record<string, string> = {}
for (const [path, content] of Object.entries(mdModules)) {
  const match = path.match(/\.\.\/pages\/([^/]+)\/prd\.md$/)
  if (match) {
    mdMap[match[1]] = content
  }
}

export interface UsePrdPanelReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  markdown: string | null
}

/**
 * @param pageKey 与 src/pages/ 下的目录名一致（如 "Home"、"ConcertDetail"）
 */
export function usePrdPanel(pageKey: string): UsePrdPanelReturn {
  const [isOpen, setIsOpen] = useState(false)
  const markdown = mdMap[pageKey] ?? null

  // 路由切换时强制关闭面板，避免历史组件残留
  useEffect(() => {
    return () => setIsOpen(false)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
    markdown,
  }
}
