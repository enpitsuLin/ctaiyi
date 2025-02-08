import { randomBytes } from 'crypto'
import * as fs from 'node:fs/promises'
import process from 'node:process'
import { Authority, Client, PrivateKey } from '../src'

export const NUM_TEST_ACCOUNTS = 2
export const TEST_NODE = process.env.TEST_NODE || 'http://127.0.0.1:8091'

export const INITMINER_PRIVATE_KEY = PrivateKey.fromString('5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n')

export function randomString(length: number) {
  return randomBytes(length * 2)
    .toString('base64')
    .replace(/[^0-9a-z]+/gi, '')
    .slice(0, length)
    .toLowerCase()
}

export async function createAccount(): Promise<{ username: string, password: string }> {
  const client = Client.testnet()
  const public_key = INITMINER_PRIVATE_KEY.createPublic('TAI')

  const password = randomString(32)
  const username = `ctaiyi-${randomString(9)}`

  const confirmation = await client.broadcast.sendOperations([
    [
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
    ],
  ], INITMINER_PRIVATE_KEY)

  const result = await client.baiyujing.getTransactionResults(confirmation.id)

  // eslint-disable-next-line no-console
  console.log(result, confirmation.id)

  return { username, password }
}

export async function getTestnetAccounts(): Promise<{ username: string, password: string }[]> {
  try {
    const data = await fs.readFile('.testnetrc')
    return JSON.parse(data.toString())
  }
  catch (error) {
    if ((error as any).code !== 'ENOENT') {
      throw error
    }
  }

  const rv: { username: string, password: string }[] = []
  while (rv.length < NUM_TEST_ACCOUNTS) {
    rv.push(await createAccount())
  }

  // eslint-disable-next-line no-console
  console.log(`CREATED TESTNET ACCOUNTS: ${rv.map(i => i.username)}`)

  await fs.writeFile('.testnetrc', JSON.stringify(rv))

  return rv
}
