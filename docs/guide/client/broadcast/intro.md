# 广播交易

```ts twoslash
import { Client, PrivateKey, TransferOperation } from '@taiyinet/ctaiyi'

declare const client: Client

declare const tx: TransferOperation[1]
declare const pk: PrivateKey
// ---cut---
const confirm = await client.broadcast.transfer(tx, pk)
```
