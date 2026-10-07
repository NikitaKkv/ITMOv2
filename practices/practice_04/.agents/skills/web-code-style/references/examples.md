# 长示例

规则本身在 `style-core.md`、`style-ui.md`。这里只放需要完整代码才讲得清的例子。

## 复杂条件：命名布尔 vs 内联

把“业务谓词”抽成名字；把“便宜的短路守卫”留在 `if` 里。不要为每一个原子比较都建变量，只有合成后的意图需要名字时才抽。

```ts
function canEditPost(user: User, post: Post, flags: FeatureFlags): boolean {
  if (!flags.editingEnabled) {
    return false
  }

  const isAuthor = post.authorId === user.id
  const isModerator = user.roles.includes('moderator')

  if (post.isLocked) {
    return isModerator
  }
  return isAuthor || isModerator
}
```

## 参数过多：options 对象

```ts
// ✗ 位置参数难读、难扩展
function openDialog(
  title: string,
  body: ReactNode,
  isModal: boolean,
  onConfirm: () => void,
  onCancel: () => void,
  confirmLabel: string,
) {}

// ✓
type OpenDialogOptions = {
  title: string
  body: ReactNode
  isModal?: boolean
  confirmLabel?: string
  onConfirm: () => void
  onCancel?: () => void
}

function openDialog(options: OpenDialogOptions) {}

openDialog({ title, body, onConfirm })
```

新增可选字段时改 options 类型，不要继续拉长位置参数列表。

## 互斥状态：union 加查表

```ts
// ✗ isError 与 isSuccess 可以同时为 true
function resolveTone(isError: boolean, isSuccess: boolean): Tone {}

// ✓ 非法状态不可表示
type Status = 'idle' | 'error' | 'success'

const toneByStatus = {
  idle: 'neutral',
  error: 'danger',
  success: 'success',
} as const satisfies Record<Status, Tone>

const tone = toneByStatus[status]
```

## 组件只管展示：外提校验

```ts
// order-validator.ts
export function validateOrder(order: Order): string[] {
  const errors: string[] = []
  if (order.items.length === 0) {
    errors.push('empty items')
  }
  return errors
}
```

```tsx
// OrderForm.tsx：只绑定数据与反馈
function OrderForm({ order, onSave }: OrderFormProps) {
  function submitOrder() {
    const errors = validateOrder(order)
    if (errors.length > 0) {
      showErrors(errors)
      return
    }
    onSave(order)
  }

  return <button onClick={submitOrder}>Save</button>
}
```

只有 `validateOrder` 满足“抽函数的门槛”（可独立测试的纯逻辑）才这样拆。一次性的两行校验直接留在组件里。

## JSX 上提的边界

```tsx
// 可留在 JSX
{isReady && <Spinner />}
{label ?? 'Untitled'}

// 应上提：多步数组变换
const rows = items
  .filter((item) => item.isVisible)
  .map((item) => ({ ...item, label: formatLabel(item) }))

return <List rows={rows} />
```
