# 通用代码风格：控制流、函数、间接层、注释

长示例见 `examples.md`。UI 专属（组件、JSX、文件内组织）见 `style-ui.md`。

## 判断标准：读者负荷

拿不准时问：新读者能否在 30 秒内答出“这个值从哪来”和“什么会改它”？答不出，就减少间接层或缩小状态范围。下面的规则都是它的推论。冲突时以它为准，其次是仓内一致性。忽略某条规则时，在代码旁写一行原因。

## 控制流

**先处理错误与边界**，主路径保持最浅缩进：

```ts
function parseProfile(raw: unknown): Profile | null {
  if (raw == null || typeof raw !== 'object') {
    return null
  }
  const record = raw as Record<string, unknown>
  if (typeof record.id !== 'string') {
    return null
  }
  return mapProfile(record)
}
```

**复杂条件抽命名布尔**：条件含 3 个及以上操作数时，抽出表达业务意图的名字；昂贵检查留在 `if` 里以保留短路。不要给每个原子比较都起名。

```ts
const isOwner = resource.ownerId === user.id
const isPublicVerified = resource.isPublic && user.isVerified
if (isOwner || isPublicVerified || permissions.includes('override')) {
  allow()
}
```

**互斥状态不要用多个布尔。** `isError` 与 `isSuccess` 可能同时为真，这是非法状态。收成一个 union，再查表代替分支，见 `examples.md`。

同一变量的多路分支用 `switch`。不要写 `switch (true)`，那种情况用 early return。

## 函数设计

- 短、单一职责。
- 参数 ≥3 个，或出现任何位置布尔参数（`f(a, true)`），改为 options 对象；调用处同样用具名字段，不要把一组相关值拆成位置参数。热路径（逐帧渲染、tokenizer、parser）例外。
- 新增可选字段时改 options 类型，不要继续拉长位置参数列表。
- 参数顺序：输入在前，回调/目的地在后，与仓内现有 API 保持一致。

示例见 `examples.md`。

## 间接层与状态范围

- **内联单调用者的包装**：只被调用一次、且不改变抽象层级的函数、适配器、别名变量，直接内联。不要为了“看起来分层”而拆。
- **抽函数的门槛**：可独立测试的纯逻辑、会被复用、或与 UI 无关的领域规则，才抽出。只为把组件变短而抽出的单次使用函数，增加的是层数，不是清晰度。
- **状态范围从小到大**：局部变量 → 组件 state → 模块状态 → 全局。能派生就派生，不要用 effect 去同步。
- **守卫集中在系统边界**（网络、存储、URL、外部 API）：边界处解析成领域类型，内部信任类型。内部不加 `?.` / `if (!x) return` 来掩盖根因。

## 注释

注释只写 **why**（约束、权衡、非显然意图），不复述 **what**。删除被注释掉的死代码，交给版本控制。

写约束注释之前先问：能不能用结构表达？能，就编码（类型、命名函数、测试、lint），然后删掉注释。

```ts
// ✗ 靠注释承载约束
// 必须先 flush 再 unmount，否则会丢数据
flush()
unmount()

// ✓ 约束进名字，调用点不需要注释
closeEditor()
```

只有关于“我们无法改变的东西”（第三方 bug、平台限制、外部协议）的注释才保留，并写明原因。表示“这里很奇怪”的注释，先考虑重塑代码。

```ts
// ✗ 复述下一行
// 设置 count 为 0
const count = 0
```
