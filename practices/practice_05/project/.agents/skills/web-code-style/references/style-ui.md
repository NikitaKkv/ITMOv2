# UI 代码风格：组件、JSX、文件内组织

通用规则见 `style-core.md`，长示例见 `examples.md`。

## 组件只管展示

组件与 Hook 里的代码服务于当前 UI。校验规则、数据变换、与界面无关的业务过程，满足 `style-core.md` 里“抽函数的门槛”时，放到同目录的普通函数或模块，再调用。组件只绑定数据与反馈，示例见 `examples.md`。

`useEffect` 等生命周期入口里不塞长逻辑，提成有语义的函数再调用：

```ts
useEffect(() => {
  startLogging()
  runBackgroundTask()
}, [])
```

## JSX：不在 JSX 里求值

标准：读 JSX 时是否还要在脑子里求值。

- 可以留在 JSX 里：单次可选链、简单三元、一个 `&&` 守卫、`label ?? 'Untitled'`。
- 必须上提：多步数组变换、嵌套三元、`map` 内的业务分支。

React 把派生值放在组件体里，不在 JSX 里写多步表达式。示例见 `examples.md`。

## 文件内组织

相关声明放在一起。组件/Hook 文件的顺序：

1. imports
2. 类型 / 常量
3. 主组件或主 Hook：公开 props、事件处理器、hooks
4. 仅本文件使用的 helper

公开 API 与 hooks 放在内部 helper 前面，读文件时先看到模板在用什么。一个文件一个主组件（或一个主 Hook）；小组件可共文件，前提是同一概念且体量小。

## Props 不当可变草稿

不要改传入的 props 对象（`props.userId = next`）。要改的是本地 state，或回传的事件载荷。
