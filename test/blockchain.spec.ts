import { WebSocketTransport } from '../src'
import { runForBothTransports } from './fixture'

vi.setConfig({
  testTimeout: 60 * 1000,
})

runForBothTransports('blockchain data for transport $transport.type', (client) => {
  beforeAll(async () => {
    if (client.transport instanceof WebSocketTransport) {
      await (<WebSocketTransport>client.transport).connect()
    }
  })

  it('should yield blocks', async () => {
    const ids: string[] = []
    for await (const block of client.blockchain.getBlocks({ from: 1, to: 2 })) {
      ids.push(block.block_id)
    }
    expect(ids).toHaveLength(2)
  })

  it('should stream blocks', async () => {
    // eslint-disable-next-line no-async-promise-executor
    const ids = await new Promise<string[]>(async (resolve, reject) => {
      const stream = client.blockchain.getBlockStream({ from: 1, to: 2 })
      const ids: string[] = []
      const reader = stream.getReader()
      try {
        while (true) {
          const { value: block, done } = await reader.read()
          if (done) {
            resolve(ids)
            break
          }
          ids.push(block.block_id)
        }
      }
      catch (error) {
        reject(error)
      }
      finally {
        reader.releaseLock()
      }
    })
    expect(ids).toHaveLength(2)
  })

  it('should yield operations', async () => {
    const ops: string[] = []
    for await (const operation of client.blockchain.getOperations({ from: 1, to: 2 })) {
      ops.push(operation.op[0])
    }
    expect(ops).toContain('producer_reward')
  })

  it('should stream operations', async () => {
    // eslint-disable-next-line no-async-promise-executor
    const ops = await new Promise<string[]>(async (resolve, reject) => {
      const stream = client.blockchain.getOperationsStream({ from: 1, to: 2 })
      const reader = stream.getReader()
      const ops: string[] = []
      try {
        while (true) {
          const { value: operation, done } = await reader.read()
          if (done) {
            resolve(ops)
            break
          }
          ops.push(operation.op[0])
        }
      }
      catch (error) {
        reject(error)
      }
      finally {
        reader.releaseLock()
      }
    })

    expect(ops).toContain('producer_reward')
  })

  it('should yield latest blocks', async () => {
    const latest = await client.blockchain.getCurrentBlock('latest')
    for await (const block of client.blockchain.getBlocks({ mode: 'latest' })) {
      if (block.block_id === latest.block_id) {
        continue
      }
      expect(block.previous).toBe(latest.block_id)
      break
    }
  })

  it('should handle errors on stream', async () => {
    await expect(
      new Promise<void>((resolve, reject) => {
        const stream = client.blockchain.getBlockStream(Number.MAX_VALUE)
        const reader = stream.getReader()
        reader.read()
          .then(() => {
            expect(false, 'unexpected stream data')
          })

          .catch(reject)
      }),
    ).rejects.toThrow()
  })

  it('should get block number stream', async () => {
    const current = await client.blockchain.getCurrentBlockNum()
    await new Promise<void>((resolve, reject) => {
      const stream = client.blockchain.getBlockNumberStream()
      const reader = stream.getReader()
      reader.read()
        .then(({ value }) => {
          expect(value! >= current)
          resolve()
        })
        .catch(reject)
    })
  })

  it('should get current block header', async () => {
    const now = Date.now()
    const header = await client.blockchain.getCurrentBlockHeader()
    const ts = new Date(`${header.timestamp}Z`).getTime()
    expect(Math.abs((ts / 1000) - (now / 1000)) < 120, 'blockheader timestamp too old')
  })
})
