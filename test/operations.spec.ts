import type { Operation } from './../src'

import { Authority, Client, PrivateKey } from './../src'
import { INITMINER_PRIVATE_KEY, randomString } from './common'

async function checkSignOperationRequiredKeys(op: Operation, client: Client, key: PrivateKey) {
  try {
    const preparedTrx = await client.broadcast.prepareTransaction({
      operations: [op],
    })

    const trx = client.broadcast.sign(preparedTrx, key)
    const publicKey = key.createPublic().toString()
    const result = await client.baiyujing.getRequiredSignatures(trx, [publicKey])

    return result.includes(publicKey)
  }
  catch (e) {
    // eslint-disable-next-line no-console
    console.dir((e as Error).cause, { depth: null })
  }
}

// 需要本地节点来处理
describe('operations', () => {
  vi.setConfig({
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 10 * 60 * 1000,
  })

  const client = Client.testnet()

  it('should create account operation signature', async () => {
    const username = `ds-${randomString(12)}`
    const password = randomString(32)
    const privateKey = PrivateKey.fromLogin(username, password)
    const public_key = privateKey.createPublic('TAI').toString()
    const work = await checkSignOperationRequiredKeys([
      'account_create',
      {
        fee: '0.001 YANG',
        creator: 'initminer',
        new_account_name: username,
        owner: Authority.from(public_key),
        active: Authority.from(public_key),
        posting: Authority.from(public_key),
        memo_key: public_key,
        json_metadata: '{ "ctaiyi-test": true }',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should update account operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'account_update',
      {
        account: 'initminer',
        memo_key: 'TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4',
        json_metadata: '{ "ctaiyi-test": true }',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should transfer operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'transfer',
      {
        from: 'initminer',
        to: 'initminer',
        amount: '1.000000 QI',
        memo: 'test',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should transfer to qi operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'transfer_to_qi',
      {
        from: 'initminer',
        to: 'initminer',
        amount: '1.000000 QI',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should withdraw qi operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'withdraw_qi',
      {
        qi: '0.100000 QI',
        account: 'initminer',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should set withdraw qi route operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'set_withdraw_qi_route',
      {
        from_account: 'initminer',
        to_account: 'initminer',
        percent: 100,
        auto_vest: true,
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should delegate qi operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'delegate_qi',
      {
        delegator: 'initminer',
        delegatee: 'initminer',
        qi: '0.100000 QI',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should siming update operation signature', async () => {
    const requireKeys = await checkSignOperationRequiredKeys([
      'siming_update',
      {
        owner: 'initminer',
        url: 'https://ctaiyi.com',
        block_signing_key: 'TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4',
        props: {
          account_creation_fee: '0.001 YANG',
          maximum_block_size: 10240,
        },
        fee: '0.001 YANG',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should siming set properties operation signature', async () => {
    const op: Operation = [
      'siming_set_properties',
      {
        owner: 'initminer',
        props: [
          ['account_creation_fee', '0.001 YANG'],
          ['key', 'TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4'],
          ['maximum_block_size', 10240],
        ],
        extensions: [],
      },
    ]
    const requireKeys = await checkSignOperationRequiredKeys(op, client, INITMINER_PRIVATE_KEY)

    expect(requireKeys).toBe(true)
  })

  it('should account siming adore operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'account_siming_adore',
      {
        account: 'initminer',
        siming: 'initminer',
        approve: true,
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should account siming proxy operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'account_siming_proxy',
      {
        account: 'initminer',
        proxy: 'initminer',
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should decline adorning rights operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'decline_adoring_rights',
      {
        account: 'initminer',
        extensions: [],
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should custom operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'custom',
      {
        required_auths: ['initminer'],
        required_posting_auths: [],
        id: 0,
        data: new TextEncoder().encode('{"foo":"bar"}'),
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should custom json operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'custom_json',
      {
        required_auths: ['initminer'],
        required_posting_auths: [],
        id: 'something',
        json: JSON.stringify({ foo: 'bar' }),
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should request account recovery operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'request_account_recovery',
      {
        recovery_account: 'initminer',
        account_to_recover: 'initminer',
        new_owner_authority: Authority.from('TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4'),
        extensions: [],
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should recover account operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'recover_account',
      {
        account_to_recover: 'initminer',
        new_owner_authority: Authority.from('TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4'),
        recent_owner_authority: Authority.from('TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4'),
        extensions: [],
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should change recovery account operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'change_recovery_account',
      {
        account_to_recover: 'initminer',
        new_recovery_account: 'initminer',
        extensions: [],
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should claim reward balance operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'claim_reward_balance',
      {
        account: 'initminer',
        reward_qi: '0.100000 QI',
        extensions: [],
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })

  it('should create contract operation signature', async () => {
    const work = await checkSignOperationRequiredKeys([
      'create_contract',
      {
        owner: 'initminer',
        name: 'contract.nfa.base',
        data: '0x',
        contract_authority: 'TAI6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4',
        extensions: [],
      },
    ], client, INITMINER_PRIVATE_KEY)

    expect(work).toBe(true)
  })
})
