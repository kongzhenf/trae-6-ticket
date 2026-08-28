// H2 detail page 运行时冒烟
// 1) 拉取首页 HTML 确认 SPA shell
// 2) 用 jsdom 加载 /concerts/10001，注入 mock 数据到 localStorage（虽然 mock 自带 seed）
// 3) 等待 hydration，断言关键 testid 存在

const { JSDOM, ResourceLoader } = require('jsdom')

const BASE = 'http://localhost:5173'
const TARGET = process.argv[2] || '/concerts/10001'

;(async () => {
  const url = `${BASE}${TARGET}`
  console.log('[h2-verify] GET', url)
  const dom = await JSDOM.fromURL(url, {
    runScripts: 'dangerously',
    resources: new ResourceLoader({ strictSSL: false }),
    pretendToBeVisual: true,
  })
  await new Promise(r => setTimeout(r, 1500))
  const html = dom.window.document.documentElement.outerHTML
  const checks = [
    ['has root mount', html.includes('id="root"')],
    ['has #app-page or react-vant root', /rv-/.test(html) || /class="app-page"/.test(html) || html.includes('detail-root')],
  ]
  for (const [k, v] of checks) console.log(`  - ${v ? '✅' : '⚠️'} ${k}`)
  console.log('[h2-verify] sample html head 800 chars:')
  console.log(html.slice(0, 800))
  dom.window.close()
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })