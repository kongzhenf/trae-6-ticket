// 找出 on_sale / published 的演出 ID
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)

const api = require(path.join(root, 'packages/api/dist/index.cjs'))
const client = api.createApiClient({ baseURL: '/api/v1', timeout: 15000, getToken: () => null })
api.installMock(client)
const concert = api.concertApi(client)

;(async () => {
  const list = await concert.listConcerts({ page: 1, pageSize: 50, status: 'on_sale,sold_out,pending' })
  console.log('=== Buyable events ===')
  for (const ev of list.list) {
    const tiers = await concert.listTickets(ev.id)
    console.log(`${ev.id} status=${ev.status} name=${ev.eventName} tickets=${tiers.length}`)
    if (tiers.length > 0) {
      const t0 = tiers[0]
      console.log(`    first tier: ${t0.categoryName} status=${t0.status} avail=${t0.availableStock}/${t0.totalStock} maxBuy=${t0.maxBuyQuantity}`)
    }
  }
})().catch(e => { console.error(e); process.exit(1) })