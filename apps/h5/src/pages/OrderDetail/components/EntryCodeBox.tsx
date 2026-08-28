export interface EntryCodeBoxProps {
  /** 入场码占位（H6 由 mock 写入；H5 暂显示订单号后 8 位） */
  code: string
  visible: boolean
}

/** 入场码盒（H8 补：入场需出示观演人本人身份证原件） */
export default function EntryCodeBox({ code, visible }: EntryCodeBoxProps) {
  if (!visible) return null
  return (
    <div
      data-testid="entry-code-box"
      data-code={code}
      style={{
        margin: '12px 12px 0',
        padding: 16,
        borderRadius: 12,
        background: 'linear-gradient(135deg,#1e293b,#334155)',
        color: '#fff',
        boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>ENTRY CODE</div>
      <div
        style={{
          marginTop: 8,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {code}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.85 }}>入场时请出示此码 + 观演人本人身份证原件</div>
    </div>
  )
}
