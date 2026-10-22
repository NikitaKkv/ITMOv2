# 通用命名：需要判断的规则

速查表在 `SKILL.md`。这里只放表里写不下、需要判断的部分。

## 布尔

布尔变量、参数、字段、prop 必须加前缀，读起来像是非题：`isLoggedIn`、`hasAdminRole`、`canWrite`、`shouldRetry`。

类型守卫按它检验的是“是不是”还是“有没有”选 `isX` / `hasX`。不要用裸动词（`checkX`、`validateX`）当类型守卫名，名字要让调用者一眼看出用完后类型会被收窄：

```ts
function isUser(value: unknown): value is User {}
function hasPermission(user: User): user is AdminUser {}
```

## 名称描述含义，不描述类型

`users` 而非 `userArray`，`count` 而非 `countNumber`。

## 概念名全库一致

同一业务概念只用一个词：`createUser`、`updateUser`、`deleteUser`，不要一个叫 `updateAccount`、一个叫 `removePerson`。仓内有术语表时以它为准。

## 缩写当普通词

HTTP、URL、ID 等缩写在 PascalCase 里只大写首字母，在 camelCase 里不大写整段：`HttpClient`、`parseUrl`、`loadHttpUrl`、`userId`。平台强制名（`XMLHttpRequest`）除外。

## 事件处理器按动作命名

处理器名描述**做什么**，而不是触发它的 DOM 事件。模板里一眼就能看出动作：

```tsx
<button onClick={saveUserData}>Save</button>   // ✓
<button onClick={handleClick}>Save</button>    // ✗
```

键盘等复杂场景可以先用 `handleKeydown` 接事件，再内部分发到 `activateBold()` 之类的具体函数。

## 函数：副作用用动词，纯结果用名词，禁空动词

执行副作用的函数用动词（`persistDraft`、`sendNotification`）；返回值的纯函数名描述结果（`formatDate`、`defaultConfig`）。不用 `handleIt`、`doThing` 这类无信息动词，改为 `processPayment`、`validateSchema`。

## 命名导出保持自描述

命名导入会丢掉模块名，调用点只剩函数名。所以 `import { parseUrl } from './url'` 优于 `import { parse } from './url'`：前者在调用点仍能读出对象，也便于 grep。只有命名空间导入时才去掉重复：`import * as url from './url'` 后调用 `url.parse(raw)`。

## 常量按角色命名

名称表达角色，不表达字面值：`MAX_RETRY_COUNT`、`DEFAULT_TIMEOUT_MS`，不要 `THREE`、`TIMEOUT_30000`。

## 作用域与名称长度成正比

短作用域用短名（循环里的 `i`、事件对象 `e`、`setState(prev => …)`），模块级用描述性名称。`signal` 与 `error` 不缩成单字母。

## 离散状态：不要数字枚举

不要让数字 `0` 成为真实业务状态：未赋值变量会静默变成第一个成员。用 string union；必须用 `enum` 时用显式字符串成员。

```ts
type OrderStatus = 'pending' | 'paid' | 'cancelled'

// 需要运行时对象时
const OrderStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Cancelled: 'cancelled',
} as const
type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
```

## 判别联合与 branded type 的命名

只管命名，要不要用以 `typescript-best-practices/references/patterns.md` 为准。

判别字段统一叫 `kind`，仓内只用一种，值用小写短词，不要全大写：

```ts
type SaveState =
  | { kind: 'idle' }
  | { kind: 'error', message: string }
  | { kind: 'saved', at: Date }
```

Branded type：类型名与领域概念同名（`UserId`，不是 `UserIdType`）。brand 字段统一叫 `__brand`，`readonly`，不对外导出。转换只发生在一个**会校验**的 `parse` + 类型名函数里，不在调用点 `as` 强转：

```ts
type UserId = string & { readonly __brand: 'UserId' }

function parseUserId(raw: string): UserId {
  if (raw.length === 0) {
    throw new Error('empty user id')
  }
  return raw as UserId // 仅在校验之后转换，且只此一处
}
```

## 其他

- 不强制“对象形状必须用 `interface` 而不能用 `type`”，文件内保持一种即可。
- 类型名不加 `Struct`、`Object`、`Data`、`Type` 这类无信息后缀。
