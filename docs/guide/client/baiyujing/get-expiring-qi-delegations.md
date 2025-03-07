# getExpiringQiDelegations

获取即将到期的真气委托信息。

## 示例

```ts twoslash
import { Client } from '@taiyinet/ctaiyi'
declare const client: Client
// ---cut---
const expiringDelegations = await client.baiyujing.getExpiringQiDelegations('alice', 3)
```

## 返回值

`ExpiringQiDelegation[]`

即将到期的真气委托信息数组。

```ts twoslash
declare interface ExpiringQiDelegation {
  id: string
  delegator: string
  qi: string
  expiration: number
}
```

## 参数

### account

- 类型: `string`

要查询的账户名

### days

- 类型: `number`

查询未来几天内到期的委托（可选，默认: 7）
