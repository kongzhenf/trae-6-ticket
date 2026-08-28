// H2 mock 完整接口契约校验
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)

const api = require(path.join(root, 'packages/api/dist/index.cjs'))

const client = api.createApiClient({
  baseURL: '/api/v1',
  timeout: 15000,
  getToken: () => null,
})
api.installMock(client)
const concert = api.concertApi(client)

function assert(cond, msg) {
  if (cond) console.log('  ✅', msg)
  else { console.log('  ❌', msg); process.exitCode = 1 }
}

;(async () => {
  console.log('[h2-mock] 详情接口 10001')
  const detail = await concert.getConcertDetail('10001')
  console.log(`     status=${detail.status} eventName=${detail.eventName}`)
  console.log(`     priceRange=${JSON.stringify(detail.priceRange)} ticketCount=${detail.ticketCount}`)
  assert(typeof detail.id === 'string', 'detail.id 是字符串')
  assert(Array.isArray(detail.priceRange) || detail.priceRange === null, 'detail.priceRange 形状正确')
  assert(typeof detail.ticketCount === 'number', 'detail.ticketCount 是数字')

  console.log('[h2-mock] 列表 聚合校验')
  const list = await concert.listConcerts({ page: 1, pageSize: 50, status: 'on_sale,pending,sold_out' })
  assert(list.list.length > 0, `list 非空 (${list.list.length})`)
  // 验证聚合与详情一致
  for (const item of list.list.slice(0, 5)) {
    const d = await concert.getConcertDetail(item.id)
    const ok = (item.priceRange?.[0] === d.priceRange?.[0])
      && (item.priceRange?.[1] === d.priceRange?.[1])
      && (item.ticketCount === d.ticketCount)
    assert(ok, `list/详情 priceRange 与 ticketCount 一致 (id=${item.id})`)
  }

  console.log('[h2-mock] 404 业务码')
  try {
    await concert.getConcertDetail('zzz-no-such')
    console.log('  ❌ 应当抛出错误')
    process.exitCode = 1
  } catch (e) {
    const code = e?.response?.data?.code
    assert(code === 400003, `错误码 400003（实际 ${code}）`)
  }

  console.log('[h2-mock] 票档列表')
  const tiers = await concert.listTickets('10001')
  assert(Array.isArray(tiers), 'tickets 是数组')
  assert(tiers.every(t => t.status !== 'hidden'), '无 hidden 票档')
  console.log(`     tiers=${tiers.length}  statusSet=${[...new Set(tiers.map(t => t.status))].join(',')}`)

  console.log('[h2-mock] 状态机枚举采样')
  const seen = new Set()
  for (const ev of list.list) {
    seen.add(ev.status)
    if (seen.size === 3) break
  }
  console.log(`     seen status: ${[...seen].join(', ')}`)
  // H1/H2 C 端可见白名单即 ['on_sale', 'sold_out', 'pending']，其它态不会从 list 接口返回
  const expected = ['on_sale', 'sold_out', 'pending']
  assert([...seen].every(s => expected.includes(s)), `C 端可见状态都在白名单 ${JSON.stringify(expected)} 内`)
})().catch(e => { console.error(e); process.exit(1) })