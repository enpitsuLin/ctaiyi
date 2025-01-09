import * as assert from 'assert'
import {VError} from 'verror'
import packageVersion from './version'

import {Blockchain} from './helpers/blockchain'
import {BroadcastAPI} from './helpers/broadcast'
import {DatabaseAPI} from './helpers/database'
import {copy, retryingFetch, waitForEvent} from './utils'

/**
 * Library version.
 */
export const VERSION = packageVersion

/**
 * Main taiyi network chain id.
 */
export const DEFAULT_CHAIN_ID = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')

/**
 * Main taiyi network address prefix.
 */
export const DEFAULT_ADDRESS_PREFIX = 'TAI'

interface RPCRequest {
    /**
     * Request sequence number.
     */
    id: number | string
    /**
     * RPC method.
     */
    method: 'call' | 'notice' | 'callback'
    /**
     * Array of parameters to pass to the method.
     */
    jsonrpc: '2.0'
    params: any[]
}

interface RPCCall extends RPCRequest {
    method: 'call'
    /**
     * 1. API to call, you can pass either the numerical id of the API you get
     *    from calling 'get_api_by_name' or the name directly as a string.
     * 2. Method to call on that API.
     * 3. Arguments to pass to the method.
     */
    params: [number|string, string, any[]]
}

interface RPCError {
    code: number
    message: string
    data?: any
}

interface RPCResponse {
    /**
     * Response sequence number, corresponding to request sequence number.
     */
    id: number
    error?: RPCError
    result?: any
}

interface PendingRequest {
    request: RPCRequest,
    timer: NodeJS.Timer | undefined
    resolve: (response: any) => void
    reject: (error: Error) => void
}

/**
 * RPC Client options
 * ------------------
 */
export interface ClientOptions {
    /**
     * Taiyi chain id. Defaults to main taiyi network:
     * `0000000000000000000000000000000000000000000000000000000000000000`
     */
    chainId?: string
    /**
     * Taiyi address prefix. Defaults to main taiyi network:
     * `TAI`
     */
    addressPrefix?: string
    /**
     * Send timeout, how long to wait in milliseconds before giving
     * up on a rpc call. Note that this is not an exact timeout,
     * no in-flight requests will be aborted, they will just not
     * be retried any more past the timeout.
     * Can be set to 0 to retry forever. Defaults to 60 * 1000 ms.
     */
    timeout?: number
    /**
     * Retry backoff function, returns milliseconds. Default = {@link defaultBackoff}.
     */
    backoff?: (tries: number) => number
    /**
     * Node.js http(s) agent, use if you want http keep-alive.
     * Defaults to using https.globalAgent.
     * @see https://nodejs.org/api/http.html#http_new_agent_options.
     */
    agent?: any // https.Agent
}

/**
 * RPC Client
 * ----------
 * Can be used in both node.js and the browser. Also see {@link ClientOptions}.
 */
export class Client {

    /**
     * Create a new client instance configured for the testnet.
     */
    public static testnet(options?: ClientOptions) {
        let opts: ClientOptions = {}
        if (options) {
            opts = copy(options)
            opts.agent = options.agent
        }

        opts.addressPrefix = 'TAI'
        opts.chainId = '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e'
        return new Client('http://127.0.0.1:8091', opts)
    }

    /**
     * Client options, *read-only*.
     */
    public readonly options: ClientOptions

    /**
     * Address to Taiyi RPC server, *read-only*.
     */
    public readonly address: string

    /**
     * Database API helper.
     */
    public readonly database: DatabaseAPI

    /**
     * Broadcast API helper.
     */
    public readonly broadcast: BroadcastAPI

    /**
     * Blockchain helper.
     */
    public readonly blockchain: Blockchain

    /**
     * Chain ID for current network.
     */
    public readonly chainId: Buffer

    /**
     * Address prefix for current network.
     */
    public readonly addressPrefix: string

    private timeout: number
    private backoff: typeof defaultBackoff

    /**
     * @param address The address to the Taiyi RPC server, e.g. `https://api.taiyi.com`.
     * @param options Client options.
     */
    constructor(address: string, options: ClientOptions = {}) {
        this.address = address
        this.options = options

        this.chainId = options.chainId ? Buffer.from(options.chainId, 'hex') : DEFAULT_CHAIN_ID
        assert.equal(this.chainId.length, 32, 'invalid chain id')
        this.addressPrefix = options.addressPrefix || DEFAULT_ADDRESS_PREFIX

        this.timeout = options.timeout || 60 * 1000
        this.backoff = options.backoff || defaultBackoff

        this.database = new DatabaseAPI(this)
        this.broadcast = new BroadcastAPI(this)
        this.blockchain = new Blockchain(this)
    }

    /**
     * Make a RPC call to the server.
     *
     * @param api     The API to call, e.g. `database_api`.
     * @param method  The API method, e.g. `get_dynamic_global_properties`.
     * @param params  Array of parameters to pass to the method, optional.
     *
     */
    public async call(api: string, method: string, params: any = []): Promise<any> {
        const request: RPCCall = {
            id: '0',
            jsonrpc: '2.0',
            method: 'call',
            params: [api, method, params],
        }
        const body = JSON.stringify(request, (key, value) => {
            // encode Buffers as hex strings instead of an array of bytes
            if (typeof value === 'object' && value.type === 'Buffer') {
                return Buffer.from(value.data).toString('hex')
            }
            return value
        })
        const opts: any = {
            body,
            cache: 'no-cache',
            headers: {'User-Agent': `ctaiyi/${ packageVersion }`},
            method: 'POST',
            mode: 'cors',
        }
        if (this.options.agent) {
            opts.agent = this.options.agent
        }
        let fetchTimeout: any
        if (api !== 'network_broadcast_api' && method.substring(0, 21) !== 'broadcast_transaction') {
            // bit of a hack to work around some nodes high error rates
            // only effective in node.js (until timeout spec lands in browsers)
            fetchTimeout = (tries) => (tries + 1) * 500
        }
        const response: RPCResponse = await retryingFetch(
            this.address, opts, this.timeout, this.backoff, fetchTimeout
        )
        // resolve FC error messages into something more readable
        if (response.error) {
            const formatValue = (value: any) => {
                switch (typeof value) {
                    case 'object':
                        return JSON.stringify(value)
                    default:
                        return String(value)
                }
            }
            const {data} = response.error
            let {message} = response.error
            if (data && data.stack && data.stack.length > 0) {
                const top = data.stack[0]
                const topData = copy(top.data)
                message = top.format.replace(/\$\{([a-z_]+)\}/gi, (match: string, key: string) => {
                    let rv = match
                    if (topData[key]) {
                        rv = formatValue(topData[key])
                        delete topData[key]
                    }
                    return rv
                })
                const unformattedData = Object.keys(topData)
                    .map((key) => ({key, value: formatValue(topData[key])}))
                    .map((item) => `${ item.key }=${ item.value}`)
                if (unformattedData.length > 0) {
                    message += ' ' + unformattedData.join(' ')
                }
            }
            throw new VError({info: data, name: 'RPCError'}, message)
        }
        assert.equal(response.id, request.id, 'got invalid response id')
        return response.result
    }

}

/**
 * Default backoff function.
 * ```min(tries*10^2, 10 seconds)```
 */
const defaultBackoff = (tries: number): number => {
    return Math.min(Math.pow(tries * 10, 2), 10 * 1000)
}
