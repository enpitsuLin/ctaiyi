# lookupSimingAccounts

按账户名模糊搜索司命账户。

## 示例

```ts twoslash
import { Client } from '@taiyinet/ctaiyi'
declare const client: Client
// ---cut---
const accounts = await client.baiyujing.lookupSimingAccounts('initminer', 10)
```

## 返回值

`string[]`

返回匹配的司命账户数组。

## 参数

### lowerBoundName

- 类型: `string`

模糊搜索的账户名

### limit

- 类型: `number`

返回的最大数量（可选，默认: 100）
