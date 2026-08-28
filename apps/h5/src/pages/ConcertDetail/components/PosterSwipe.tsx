import { useEffect, useRef, useState } from 'react'

export interface PosterSwipeProps {
  /** 海报图片 URL 列表；当为空或全部无效时显示 fallback 占位 */
  posters: string[]
  /** 顶部标题（用于占位 fallback 显示） */
  fallbackTitle: string
}

/**
 * 海报轮播（纯手写横向滚动 + 指示器）
 * - 避开 react-vant 3.3.5 中 Swiper.Item 的 ESM/CJS interop 陷阱
 *   （命名导入拿到的 Swiper 函数不一定带 .Item，导致渲染时报「got undefined」」
 * - 单图不启用轮播；多图带自动切换 + 指示器 + 触摸拖拽
 * - 图片 onError 自动从列表剔除
 */
export default function PosterSwipe({ posters, fallbackTitle }: PosterSwipeProps) {
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; dx: number } | null>(null)

  const validPosters = posters.filter(Boolean)
  const showable = validPosters.filter((_, i) => !failed[i])
  const total = showable.length
  const hasImage = total > 0

  // 自动轮播（仅多图时）
  useEffect(() => {
    if (total <= 1) return
    const t = window.setInterval(() => {
      setActive(prev => (prev + 1) % total)
    }, 5000)
    return () => window.clearInterval(t)
  }, [total])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (total <= 1) return
    dragRef.current = { startX: e.clientX, dx: 0 }
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    dragRef.current.dx = e.clientX - dragRef.current.startX
  }
  function onPointerUp() {
    const d = dragRef.current
    dragRef.current = null
    if (!d || total <= 1) return
    if (d.dx < -40) setActive(prev => (prev + 1) % total)
    else if (d.dx > 40) setActive(prev => (prev - 1 + total) % total)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 10',
        background: 'linear-gradient(135deg,#1e293b,#334155)',
        color: '#fff',
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      {hasImage ? (
        <>
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              transform: `translateX(-${active * 100}%)`,
              transition: 'transform 300ms ease',
              willChange: 'transform',
            }}
          >
            {showable.map((src, i) => (
              <div
                key={`${src}-${i}`}
                style={{
                  flex: '0 0 100%',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}
              >
                <img
                  src={src}
                  alt={`${fallbackTitle} 海报 ${i + 1}`}
                  onError={() => {
                    const origIndex = validPosters.indexOf(src)
                    setFailed(prev => ({ ...prev, [origIndex]: true }))
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    background: '#1e293b',
                  }}
                />
              </div>
            ))}
          </div>
          {total > 1 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(15,23,42,0.6)',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  pointerEvents: 'none',
                }}
              >
                {active + 1} / {total}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {showable.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setActive(i)}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: i === active ? '#fff' : 'rgba(255,255,255,0.4)',
                      transition: 'background 200ms ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700, opacity: 0.6 }}>♪</div>
          <div style={{ fontSize: 14, opacity: 0.7, maxWidth: 240 }}>{fallbackTitle}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>暂无海报</div>
        </div>
      )}
    </div>
  )
}