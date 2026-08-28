// Debug H4 page state
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)
const api = require(path.join(root, 'packages/api/dist/index.cjs'))
const client = api.createApiClient({ baseURL: '/api/v1', timeout: 15000, getToken: () => null })
api.installMock(client)
const c = api.concertApi(client)
;(async () => {
  // 按 list 顺序找出 on_sale 且第一个票档可用的演出
  const list = await c.listConcerts({ page: 1, pageSize: 50, status: 'on_sale' })
  for (const ev of list.list) {
    const ts = await c.listTickets(ev.id)
    if (ts.length > 0) {
      console.log(`eventId=${ev.id} status=${ev.status} name=${ev.eventName} firstTier=${ts[0].id} (${ts[0].categoryName}) avail=${ts[0].availableStock}`)
    }
  }
})().catch(e => { console.error(e); process.exit(1) })