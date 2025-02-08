import type { Operation } from './../src'

import { Authority, Client, PrivateKey } from './../src'
import { INITMINER_PRIVATE_KEY, randomString } from './common'

async function getOperationPotentialSignatures(op: Operation, client: Client, key: PrivateKey) {
  const preparedTrx = await client.broadcast.prepareTransaction({
    operations: [op],
  })

  const trx = client.broadcast.sign(preparedTrx, key)
  return client.baiyujing.getPotentialSignatures(trx)
}

// 需要本地节点来处理
describe('operations', () => {
  vi.setConfig({
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 10 * 60 * 1000,
  })

  const client = Client.testnet()

  // type Account = Awaited<ReturnType<typeof getTestnetAccounts>>[number]
  // let acc1: Account, acc2: Account
  // let acc1Key: PrivateKey

  // beforeAll(async () => {
  //   [acc1, acc2] = await getTestnetAccounts()
  //   acc1Key = PrivateKey.fromLogin(acc1.username, acc1.password, 'active')
  // })

  it('should create account operation signature', async () => {
    const username = `ds-${randomString(12)}`
    const password = randomString(32)
    const privateKey = PrivateKey.fromLogin(username, password)
    const public_key = privateKey.createPublic('TAI')
    const work = await getOperationPotentialSignatures([
      'account_create',
      {
        fee: '0.001 YANG',
        creator: 'initminer',
        new_account_name: username,
        owner: Authority.from(public_key.toString()),
        active: Authority.from(public_key.toString()),
        posting: Authority.from(public_key.toString()),
        memo_key: public_key.toString(),
        json_metadata: '{ "ctaiyi-test": true }',
      },
    ], client, INITMINER_PRIVATE_KEY)

    const publicKey = INITMINER_PRIVATE_KEY.createPublic().toString()

    expect(work).contain(publicKey)
  })
})
