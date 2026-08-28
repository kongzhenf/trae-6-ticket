// 找 tier 20040 属于哪个 event
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)
const api = require(path.join(root, 'packages/api/dist/index.cjs'))
const client = api.createApiClient({ baseURL: '/api/v1', timeout: 15000, getToken: () => null })
api.installMock(client)
const c = api.concertApi(client)
;(async () => {
  // Try event 10030..10001 backwards
  for (let id = 10030; id >= 10001; id--) {
    try {
      const ts = await c.listTickets(String(id))
      const has20040 = ts.some(t => t.id === '20040')
      if (has20040) {
        console.log(`event ${id} has tier 20040`)
        const ev = await c.getConcertDetail(String(id))
        console.log(`  status=${ev.status} name=${ev.eventName}`)
      }
    } catch {}
  }
})().catch(e => { console.error(e); process.exit(1) })